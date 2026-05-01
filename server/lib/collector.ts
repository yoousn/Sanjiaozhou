import { execFile, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { 
  CollectVideoCandidate, 
  CollectSearchLog, 
  CollectPreview,
  CollectPreviewLog,
  GunGroup
} from "../../src/types.js";
import { ensureGroupShape } from "./shape.js";
import { 
  CREATOR_OPTIONS, 
  COLLECT_SCRIPT, 
  readCollectSettings, 
  getProviderAndModel, 
  buildModelOptionValue 
} from "./collectSettings.js";
import { uniqueTrimmed } from "./merge.js";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type SearchStreamState = {
  logs: CollectSearchLog[];
  done: boolean;
  result?: {
    creators: any[];
    guns: string[];
    creatorIds: string[];
    videos: CollectVideoCandidate[];
    logs: CollectSearchLog[];
    errors: string[];
  };
  error?: string;
  process?: ChildProcess;
};

export const searchStreams = new Map<string, SearchStreamState>();

export function parseCollectorJson(stdout: string) {
  try {
    return JSON.parse(stdout || "{}");
  } catch (error) {
    const match = (stdout || "").match(/\{[\s\S]*\}$/);
    if (!match) {
      throw error;
    }
    return JSON.parse(match[0]);
  }
}

export function parseProgressLogs(stderr: string) {
  return stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("__COLLECT_LOG__"))
    .map((line) => line.slice("__COLLECT_LOG__".length))
    .map((line) => {
      try {
        return JSON.parse(line) as CollectSearchLog;
      } catch {
        return null;
      }
    })
    .filter((item): item is CollectSearchLog => Boolean(item));
}

export function buildSearchResponse(parsed: any, guns: string[], creatorIds: string[]) {
  return {
    creators: CREATOR_OPTIONS,
    guns,
    creatorIds,
    videos: Array.isArray(parsed?.videos) ? parsed.videos as CollectVideoCandidate[] : [],
    logs: Array.isArray(parsed?.logs) ? parsed.logs as CollectSearchLog[] : [],
    errors: Array.isArray(parsed?.errors) ? parsed.errors.map(String) : [],
  };
}

export function ensureCreatorIds(creatorIds?: string[]) {
  const allIds = CREATOR_OPTIONS.map((creator) => creator.id);
  const allowed = new Set(allIds);
  const values = uniqueTrimmed(creatorIds, allIds).filter((id) => allowed.has(id));
  return values.length > 0 ? values : allIds;
}

export function ensureModel(value?: string) {
  const settings = readCollectSettings();
  const { provider, model } = getProviderAndModel(settings, value);
  return {
    provider,
    model,
    value: provider && model ? buildModelOptionValue(provider.id, model) : "",
  };
}

export async function runCollector(args: string[]) {
  const { stdout } = await execFileAsync("python", ["-u", COLLECT_SCRIPT, ...args], {
    cwd: path.join(__dirname, "..", ".."),
    maxBuffer: 1024 * 1024 * 20,
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONIOENCODING: "utf-8",
    },
  });

  const parsed = parseCollectorJson(stdout);
  return parsed;
}

export function normalizeProviderBaseUrl(baseUrl: string) {
  const normalized = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalized) return "";
  if (/\/v\d+(?:\/|$)/.test(normalized)) return normalized;
  return `${normalized}/v1`;
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`解析 JSON 响应失败，接口地址可能不正确。返回内容为: ${text.slice(0, 180)}`);
  }
}

export async function fetchModelsFromProvider(baseUrl: string, apiKey: string) {
  const normalizedBaseUrl = normalizeProviderBaseUrl(baseUrl);
  const response = await fetch(`${normalizedBaseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(String(payload?.error?.message || payload?.error || "获取模型列表失败"));
  }

  const models = Array.isArray(payload?.data)
    ? payload.data.map((item: any) => String(item?.id || "").trim()).filter(Boolean)
    : [];

  return [...new Set(models)];
}

export async function runSearchCollectorStream(requestId: string, guns: string[], creatorIds: string[], concurrent: boolean, maxVideos: number) {
  const state: SearchStreamState = { logs: [], done: false };
  searchStreams.set(requestId, state);

  const child = spawn("python", ["-u", COLLECT_SCRIPT, "--mode", "search", "--guns", guns.join(","), "--creator-ids", creatorIds.join(","), "--max-videos", String(maxVideos), "--concurrent", concurrent ? "true" : "false"], {
    cwd: path.join(__dirname, "..", ".."),
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PYTHONIOENCODING: "utf-8",
    },
  });

  let stdout = "";
  let stderr = "";

  state.process = child;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });

  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
    const logs = parseProgressLogs(chunk);
    if (logs.length > 0) {
      state.logs.push(...logs);
    }
  });

  child.on("error", (error) => {
    state.done = true;
    state.error = error.message;
  });

  child.on("close", (code) => {
    try {
      const parsed = parseCollectorJson(stdout);
      const result = buildSearchResponse(parsed, guns, creatorIds);
      const mergedLogs = [...state.logs];
      for (const log of result.logs) {
        if (!mergedLogs.some((item) => item.timestamp === log.timestamp && item.stage === log.stage && item.message === log.message)) {
          mergedLogs.push(log);
        }
      }
      state.logs = mergedLogs;
      state.result = { ...result, logs: mergedLogs };
      if (code !== 0 && !state.result.errors.length) {
        state.result.errors = [`搜索进程异常退出：${code}`];
      }
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Collect search failed";
      const stderrMessage = stderr.trim();
      if (stderrMessage) {
        state.logs.push({
          timestamp: Date.now(),
          stage: "process-error",
          message: stderrMessage,
        });
      }
    } finally {
      state.done = true;
      setTimeout(() => {
        searchStreams.delete(requestId);
      }, 1000 * 60 * 10);
    }
  });
}

export async function searchCollectVideos(guns: string[], creatorIds: string[], concurrent: boolean, maxVideos: number) {
  const parsed = await runCollector([
    "--mode",
    "search",
    "--guns",
    guns.join(","),
    "--creator-ids",
    creatorIds.join(","),
    "--max-videos",
    String(maxVideos),
    "--concurrent",
    concurrent ? "true" : "false",
  ]);

  return buildSearchResponse(parsed, guns, creatorIds);
}

export async function previewCollectGroups(
  guns: string[],
  creatorIds: string[],
  videoIds: string[],
  modelValue: string,
  videos: Array<{bvid?: string; id?: string; title?: string; description?: string; author?: string; url?: string; matchedIn?: Array<string>}> = [],
  concurrent: boolean = false
): Promise<CollectPreview> {
  const ensuredModel = ensureModel(modelValue);
  if (!ensuredModel.provider || !ensuredModel.model) {
    return {
      success: false,
      model: modelValue,
      target_guns: guns,
      creatorIds,
      videoIds,
      groups: [],
      logs: [],
      errors: ["请选择可用模型"],
    };
  }

  const args = [
    "--mode", "preview",
    "--guns", guns.join(","),
    "--creator-ids", creatorIds.join(","),
    "--video-ids", videoIds.join(","),
    "--model", ensuredModel.model,
    "--base-url", ensuredModel.provider.baseUrl,
    "--api-key", ensuredModel.provider.apiKey,
    "--concurrent", concurrent ? "true" : "false",
  ];

  if (videos.length > 0) {
    args.push("--videos-json", JSON.stringify(videos));
  }

  const parsed = await runCollector(args);

  return {
    success: Boolean(parsed?.success),
    model: ensuredModel.value,
    target_guns: Array.isArray(parsed?.target_guns) ? parsed.target_guns : guns,
    creatorIds,
    videoIds,
    groups: Array.isArray(parsed?.groups) ? parsed.groups.map(ensureGroupShape) : [],
    logs: Array.isArray(parsed?.logs) ? parsed.logs : [],
    errors: Array.isArray(parsed?.errors) ? parsed.errors.map(String) : [],
  };
}

export async function chatWithModel(modelValue: string, messages: Array<{ role: string; content: string }>) {
  const ensuredModel = ensureModel(modelValue);
  if (!ensuredModel.provider || !ensuredModel.model) {
    return {
      model: modelValue,
      success: false,
      latencyMs: 0,
      error: "请选择可用模型",
    };
  }

  const normalizedBaseUrl = normalizeProviderBaseUrl(ensuredModel.provider.baseUrl);
  const start = Date.now();
  const response = await fetch(`${normalizedBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ensuredModel.provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ensuredModel.model,
      messages: messages.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: String(message.content || ""),
      })),
    }),
  });

  const payload = await readJsonResponse(response);
  const latencyMs = Date.now() - start;
  if (!response.ok) {
    return {
      model: ensuredModel.value,
      success: false,
      latencyMs,
      error: String(payload?.error?.message || payload?.error || "模型回复失败"),
    };
  }

  const message = payload?.choices?.[0]?.message || {};
  const content = String(message.content || "").trim();
  const reasoning = message.reasoning_content || message.reasoning;
  return {
    model: ensuredModel.value,
    success: Boolean(content || reasoning),
    content,
    reasoning: reasoning ? String(reasoning) : undefined,
    latencyMs,
    error: content || reasoning ? undefined : "模型没有返回文本内容",
  };
}

export async function testModel(modelValue: string) {
  const result = await chatWithModel(modelValue, [{ role: "user", content: '回复"ok"' }]);
  return {
    model: result.model,
    success: Boolean(result.success && (result.content || result.reasoning)),
    latencyMs: Number(result.latencyMs) || 0,
    error: result.success ? undefined : result.error,
  };
}
