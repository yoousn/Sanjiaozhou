import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { execFile, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ 配置常量 ============
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const DATA_FILE = path.join(__dirname, "src", "data.json");
const COLLECT_SCRIPT = path.join(__dirname, "scripts", "collect_bilibili_test.py");
const COLLECT_SETTINGS_FILE = path.join(__dirname, "scripts", "collect_settings.json");
const AUTO_LOGS_FILE = path.join(__dirname, "scripts", "auto_logs.json");
const MAX_VARIANTS_PER_GUN = 5;
const DEFAULT_PRESET_GUNS = ["M4A1", "AKM", "SCAR-L", "AUG", "MP7", "AWM", "M14"];
const DEFAULT_PROVIDER_ID = "builtin-default";
const BUILTIN_PROVIDER = {
  id: DEFAULT_PROVIDER_ID,
  name: "yousn.me 接口",
  baseUrl: "https://api.yousn.me/v1",
  apiKey: "sk-88AqJeSQhfrmVTDcSAOTZDb6NqEbG3X8C3na3WqolNdasdpb",
  models: ["glm-5", "openai/gpt-oss-20b", "openai/gpt-oss-120b", "stepfun-ai/step-3.5-flash"],
};
const DEFAULT_MODEL_VALUE = `${DEFAULT_PROVIDER_ID}::openai/gpt-oss-120b`;
const CREATOR_OPTIONS: { id: string; name: string }[] = [
  { id: "52717408", name: "Always聪聪" },
  { id: "5995562", name: "初水改枪" },
  { id: "2025603", name: "C8_saber" },
];


type GunVariant = {
  id: string;
  tier: string;
  price: string;
  buildType: string;
  code: string;
  date: string;
  author?: string;
  sourceUrl?: string;
  locked?: boolean;
};

type GunGroup = {
  id: string;
  name: string;
  category: string;
  variants: GunVariant[];
};

type CollectModelProvider = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
};

type CollectModelOption = {
  value: string;
  providerId: string;
  providerName: string;
  model: string;
  label: string;
};

type CollectConcurrencySettings = {
  searchEnabled: boolean;
  applyEnabled: boolean;
};

type AutoCollectSettings = {
  enabled: boolean;
  model: string;
  creatorIds: string[];
  intervalHours: number;
};

type CollectSettings = {
  presetGuns: string[];
  providers: CollectModelProvider[];
  defaultModel: string;
  concurrency: CollectConcurrencySettings;
  autoCollect: AutoCollectSettings;
};

type CollectModelProviderMeta = {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
  hasApiKey: boolean;
};

type CollectCreator = {
  id: string;
  name: string;
};

type CollectVideoCandidate = {
  id: string;
  bvid: string;
  title: string;
  author: string;
  uploadDate: string;
  url: string;
  matchedIn: Array<"title" | "description">;
};

type CollectSearchLog = {
  timestamp: number;
  stage: string;
  creatorId?: string;
  creatorName?: string;
  videoId?: string;
  message: string;
};

type CollectPreviewLog = {
  title?: string;
};

type CollectPreview = {
  success?: boolean;
  model?: string;
  target_guns?: string[];
  creatorIds?: string[];
  videoIds?: string[];
  groups: GunGroup[];
  logs?: CollectPreviewLog[];
  errors?: string[];
};

type SearchRequest = {
  guns?: string[];
  creatorIds?: string[];
  maxVideos?: number;
};

type SearchStreamRequest = {
  guns?: string[];
  creatorIds?: string[];
  requestId?: string;
  concurrent?: boolean;
  maxVideos?: number;
};

type PreviewRequest = {
  guns?: string[];
  creatorIds?: string[];
  videoIds?: string[];
  model?: string;
  videos?: CollectVideoCandidate[];
  providerId?: string;
  concurrent?: boolean;
};

type ModelTestRequest = {
  model?: string;
  providerId?: string;
};

type UpdatePresetGunsRequest = {
  presetGuns?: string[];
};

type UpsertProviderRequest = {
  id?: string;
  name?: string;
  baseUrl?: string;
  apiKey?: string;
  models?: string[];
  defaultModel?: string;
};

type FetchProviderModelsRequest = {
  baseUrl?: string;
  apiKey?: string;
};

type DeleteProviderRequest = {
  id?: string;
};

type UpdateConcurrencyRequest = {
  searchEnabled?: boolean;
  applyEnabled?: boolean;
};

type SearchStreamState = {
  logs: CollectSearchLog[];
  done: boolean;
  result?: {
    creators: CollectCreator[];
    guns: string[];
    creatorIds: string[];
    videos: CollectVideoCandidate[];
    logs: CollectSearchLog[];
    errors: string[];
  };
  error?: string;
  process?: ChildProcess;
};

type AutoLog = {
  time: string;
  message: string;
  success: boolean;
};

function readAutoLogs(): AutoLog[] {
  if (!fs.existsSync(AUTO_LOGS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(AUTO_LOGS_FILE, "utf-8") || "[]");
  } catch {
    return [];
  }
}

function addAutoLog(message: string, success: boolean) {
  const logs = readAutoLogs();
  // 使用 'sv' locale 来获得 YYYY-MM-DD HH:MM:SS 格式，并指定北京时区
  const beijingTime = new Date().toLocaleString('sv', { timeZone: 'Asia/Shanghai' }).slice(0, 19);
  logs.unshift({ time: beijingTime, message, success });
  if (logs.length > 100) logs.length = 100;
  fs.writeFileSync(AUTO_LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
}

const searchStreams = new Map<string, SearchStreamState>();

function parseCollectorJson(stdout: string) {
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

function parseProgressLogs(stderr: string) {
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

function buildSearchResponse(parsed: any, guns: string[], creatorIds: string[]) {
  return {
    creators: CREATOR_OPTIONS,
    guns,
    creatorIds,
    videos: Array.isArray(parsed?.videos) ? parsed.videos as CollectVideoCandidate[] : [],
    logs: Array.isArray(parsed?.logs) ? parsed.logs as CollectSearchLog[] : [],
    errors: Array.isArray(parsed?.errors) ? parsed.errors.map(String) : [],
  };
}


function ensureVariantShape(variant: Partial<GunVariant>): GunVariant {
  return {
    id: variant.id || `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    tier: variant.tier === "未标注" ? "" : (variant.tier || ""),
    price: variant.price === "未标注" ? "" : (variant.price || ""),
    buildType: variant.buildType === "未标注" ? "" : (variant.buildType || ""),
    code: variant.code || "",
    date: variant.date || "",
    author: variant.author || "",
    sourceUrl: variant.sourceUrl || "",
    locked: Boolean(variant.locked),
  };
}

function ensureGroupShape(group: Partial<GunGroup>): GunGroup {
  return {
    id: group.id || `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: group.name || "未知枪械",
    category: group.category || "other",
    variants: Array.isArray(group.variants) ? group.variants.map(ensureVariantShape) : [],
  };
}

function readBuilds(): GunGroup[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const parsed = JSON.parse(raw || "[]");
  return Array.isArray(parsed) ? parsed.map(ensureGroupShape) : [];
}

function writeBuilds(data: GunGroup[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function normalizeGunName(name: string) {
  return (name || "").trim().toLowerCase();
}

function trimUniqueStrings(values: string[] | undefined, fallback: string[] = []) {
  const items = Array.isArray(values) ? values : fallback;
  return [...new Set(items.map((value) => String(value || "").trim()).filter(Boolean))];
}

function buildModelOptionValue(providerId: string, model: string) {
  return `${providerId}::${model}`;
}

function parseModelOptionValue(value?: string) {
  const [providerId = "", ...modelParts] = String(value || "").split("::");
  return {
    providerId,
    model: modelParts.join("::"),
  };
}

function sanitizeProvider(provider: Partial<CollectModelProvider>, fallbackId?: string): CollectModelProvider {
  const id = String(provider.id || fallbackId || `provider_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).trim();
  return {
    id,
    name: String(provider.name || "未命名模型源").trim() || "未命名模型源",
    baseUrl: String(provider.baseUrl || "").trim().replace(/\/+$/, ""),
    apiKey: String(provider.apiKey || "").trim(),
    models: trimUniqueStrings(provider.models, []),
  };
}

function getDefaultCollectSettings(): CollectSettings {
  return {
    presetGuns: [...DEFAULT_PRESET_GUNS],
    providers: [
      sanitizeProvider(BUILTIN_PROVIDER, DEFAULT_PROVIDER_ID),
    ],
    defaultModel: DEFAULT_MODEL_VALUE,
    concurrency: {
      searchEnabled: false,
      applyEnabled: false,
    },
    autoCollect: {
      enabled: false,
      model: DEFAULT_MODEL_VALUE,
      creatorIds: [],
      intervalHours: 1,
    }
  };
}

function readCollectSettings(): CollectSettings {
  const defaults = getDefaultCollectSettings();
  if (!fs.existsSync(COLLECT_SETTINGS_FILE)) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(COLLECT_SETTINGS_FILE, "utf-8") || "{}");
    const savedProviders = Array.isArray(parsed?.providers) ? parsed.providers.map((provider: Partial<CollectModelProvider>) => sanitizeProvider(provider)) : [];
    const providers = [
      sanitizeProvider(BUILTIN_PROVIDER, DEFAULT_PROVIDER_ID),
      ...savedProviders.filter((provider) => provider.id !== DEFAULT_PROVIDER_ID && provider.id !== "yousn-provider"),
    ];
    const modelOptions = providers.flatMap((provider) => provider.models.map((model) => buildModelOptionValue(provider.id, model)));
    const defaultModel = modelOptions.includes(String(parsed?.defaultModel || "")) ? String(parsed.defaultModel) : DEFAULT_MODEL_VALUE;

    return {
      presetGuns: trimUniqueStrings(parsed?.presetGuns, DEFAULT_PRESET_GUNS),
      providers,
      defaultModel,
      concurrency: {
        searchEnabled: Boolean(parsed?.concurrency?.searchEnabled),
        applyEnabled: Boolean(parsed?.concurrency?.applyEnabled),
      },
      autoCollect: {
        enabled: Boolean(parsed?.autoCollect?.enabled),
        model: String(parsed?.autoCollect?.model || defaultModel),
        creatorIds: Array.isArray(parsed?.autoCollect?.creatorIds) ? parsed.autoCollect.creatorIds : [],
        intervalHours: Number(parsed?.autoCollect?.intervalHours) || 1,
      }
    };
  } catch {
    return defaults;
  }
}

function writeCollectSettings(settings: CollectSettings) {
  const providers = settings.providers
    .map((provider) => sanitizeProvider(provider))
    .filter((provider, index, array) => provider.baseUrl && provider.models.length > 0 && array.findIndex((item) => item.id === provider.id) === index);

  const nextSettings: CollectSettings = {
    presetGuns: trimUniqueStrings(settings.presetGuns, DEFAULT_PRESET_GUNS),
    providers,
    defaultModel: settings.defaultModel,
    concurrency: {
      searchEnabled: Boolean(settings.concurrency.searchEnabled),
      applyEnabled: Boolean(settings.concurrency.applyEnabled),
    },
    autoCollect: {
      enabled: Boolean(settings.autoCollect?.enabled),
      model: String(settings.autoCollect?.model || settings.defaultModel),
      creatorIds: Array.isArray(settings.autoCollect?.creatorIds) ? settings.autoCollect.creatorIds : [],
      intervalHours: Number(settings.autoCollect?.intervalHours) || 1,
    }
  };

  fs.writeFileSync(COLLECT_SETTINGS_FILE, JSON.stringify(nextSettings, null, 2), "utf-8");
}

function buildProviderMeta(provider: CollectModelProvider): CollectModelProviderMeta {
  return {
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    models: provider.models,
    hasApiKey: Boolean(provider.apiKey),
  };
}

function buildCollectMeta(settings: CollectSettings) {
  const modelOptions: CollectModelOption[] = settings.providers.flatMap((provider) =>
    provider.models.map((model) => ({
      value: buildModelOptionValue(provider.id, model),
      providerId: provider.id,
      providerName: provider.name,
      model,
      label: `${provider.name} / ${model}`,
    }))
  );

  const defaultModel = modelOptions.some((option) => option.value === settings.defaultModel)
    ? settings.defaultModel
    : (modelOptions[0]?.value || "");

  return {
    creators: CREATOR_OPTIONS,
    models: modelOptions.map((option) => option.value),
    defaultModel,
    defaultGuns: settings.presetGuns,
    providers: settings.providers.map(buildProviderMeta),
    modelOptions,
    concurrency: settings.concurrency,
  };
}

function getProviderAndModel(settings: CollectSettings, value?: string) {
  const parsed = parseModelOptionValue(value || settings.defaultModel);
  const provider = settings.providers.find((item) => item.id === parsed.providerId) || settings.providers[0];
  const model = provider?.models.includes(parsed.model) ? parsed.model : (provider?.models[0] || "");
  return { provider, model };
}

function sortVariantsNewestFirst(variants: GunVariant[]) {
  return [...variants].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

function uniqueTrimmed(values: string[] | undefined, fallback: string[]) {
  return trimUniqueStrings(values, fallback);
}

function mergeGroupVariants(existing: GunVariant[], incoming: GunVariant[]) {
  const locked = sortVariantsNewestFirst(existing.filter((variant) => variant.locked));
  const lockedCodes = new Set(locked.map((variant) => variant.code));
  const merged: GunVariant[] = [...locked];
  const seenCodes = new Set(lockedCodes);

  for (const variant of sortVariantsNewestFirst(incoming.map(ensureVariantShape))) {
    if (!variant.code || seenCodes.has(variant.code)) continue;
    merged.push({ ...variant, locked: false });
    seenCodes.add(variant.code);
  }

  for (const variant of sortVariantsNewestFirst(existing.filter((item) => !item.locked))) {
    if (merged.length >= MAX_VARIANTS_PER_GUN) break;
    if (!variant.code || seenCodes.has(variant.code)) continue;
    merged.push(ensureVariantShape(variant));
    seenCodes.add(variant.code);
  }

  return merged.slice(0, MAX_VARIANTS_PER_GUN);
}

function mergeCollectedGroups(currentData: GunGroup[], incomingGroups: GunGroup[]) {
  const nextData = [...currentData];

  for (const rawGroup of incomingGroups) {
    const group = ensureGroupShape(rawGroup);
    const existingGroup = nextData.find((item) => normalizeGunName(item.name) === normalizeGunName(group.name));

    if (existingGroup) {
      existingGroup.category = group.category || existingGroup.category;
      existingGroup.variants = mergeGroupVariants(existingGroup.variants, group.variants);
      continue;
    }

    nextData.unshift({
      ...group,
      variants: mergeGroupVariants([], group.variants),
    });
  }

  return nextData;
}

function ensureCreatorIds(creatorIds?: string[]) {
  const settings = readCollectSettings();
  const allIds = CREATOR_OPTIONS.map((creator) => creator.id);
  const allowed = new Set(allIds);
  const values = uniqueTrimmed(creatorIds, allIds).filter((id) => allowed.has(id));
  return values.length > 0 ? values : allIds;
}

function ensureModel(value?: string) {
  const settings = readCollectSettings();
  const { provider, model } = getProviderAndModel(settings, value);
  return {
    provider,
    model,
    value: provider && model ? buildModelOptionValue(provider.id, model) : "",
  };
}

async function runCollector(args: string[]) {
  const { stdout } = await execFileAsync("python", [COLLECT_SCRIPT, ...args], {
    cwd: __dirname,
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

async function fetchModelsFromProvider(baseUrl: string, apiKey: string) {
  const normalizedBaseUrl = String(baseUrl || "").trim().replace(/\/+$/, "");
  const response = await fetch(`${normalizedBaseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(payload?.error?.message || payload?.error || "获取模型列表失败"));
  }

  const models = Array.isArray(payload?.data)
    ? payload.data.map((item: any) => String(item?.id || "").trim()).filter(Boolean)
    : [];

  return [...new Set(models)];
}

async function runSearchCollectorStream(requestId: string, guns: string[], creatorIds: string[], concurrent: boolean, maxVideos: number) {
  const state: SearchStreamState = { logs: [], done: false };
  searchStreams.set(requestId, state);

  const child = spawn("python", [COLLECT_SCRIPT, "--mode", "search", "--guns", guns.join(","), "--creator-ids", creatorIds.join(","), "--max-videos", String(maxVideos), "--concurrent", concurrent ? "true" : "false"], {
    cwd: __dirname,
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

async function searchCollectVideos(guns: string[], creatorIds: string[], concurrent: boolean, maxVideos: number) {
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

async function previewCollectGroups(
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

async function testModel(modelValue: string) {
  const ensuredModel = ensureModel(modelValue);
  if (!ensuredModel.provider || !ensuredModel.model) {
    return {
      model: modelValue,
      success: false,
      latencyMs: 0,
      error: "请选择可用模型",
    };
  }

  const parsed = await runCollector([
    "--mode",
    "test-model",
    "--model",
    ensuredModel.model,
    "--base-url",
    ensuredModel.provider.baseUrl,
    "--api-key",
    ensuredModel.provider.apiKey,
  ]);

  return {
    model: ensuredModel.value,
    success: Boolean(parsed?.success),
    latencyMs: Number(parsed?.latencyMs) || 0,
    error: parsed?.error ? String(parsed.error) : undefined,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get("/api/builds", (req, res) => {
    try {
      res.json(readBuilds());
    } catch (e) {
      console.error("API GET Error:", e);
      res.status(500).json({ error: "Failed to read data" });
    }
  });

  app.get("/api/collect/meta", (req, res) => {
    res.json(buildCollectMeta(readCollectSettings()));
  });

  app.post("/api/collect/preset-guns", (req, res) => {
    try {
      const body = (req.body || {}) as UpdatePresetGunsRequest;
      const settings = readCollectSettings();
      settings.presetGuns = trimUniqueStrings(body.presetGuns, DEFAULT_PRESET_GUNS);
      writeCollectSettings(settings);
      res.json({ success: true, meta: buildCollectMeta(readCollectSettings()) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "保存预设枪械失败" });
    }
  });

  app.post("/api/collect/providers/fetch-models", async (req, res) => {
    try {
      const body = (req.body || {}) as FetchProviderModelsRequest;
      const models = await fetchModelsFromProvider(String(body.baseUrl || ""), String(body.apiKey || ""));
      res.json({ success: true, models });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "获取模型列表失败" });
    }
  });

  app.post("/api/collect/providers", (req, res) => {
    try {
      const body = (req.body || {}) as UpsertProviderRequest;
      const settings = readCollectSettings();
      const provider = sanitizeProvider({
        id: body.id,
        name: body.name,
        baseUrl: body.baseUrl,
        apiKey: body.apiKey,
        models: body.models,
      }, body.id);

      if (!provider.baseUrl) {
        return res.status(400).json({ error: "请填写接口地址" });
      }

      const nextProviders = settings.providers.filter((item) => item.id !== DEFAULT_PROVIDER_ID && item.id !== provider.id);
      settings.providers = [settings.providers.find((item) => item.id === DEFAULT_PROVIDER_ID) || sanitizeProvider(BUILTIN_PROVIDER, DEFAULT_PROVIDER_ID), provider, ...nextProviders];
      const defaultCandidate = body.defaultModel && provider.models.includes(String(body.defaultModel))
        ? buildModelOptionValue(provider.id, String(body.defaultModel))
        : settings.defaultModel;
      settings.defaultModel = defaultCandidate;
      writeCollectSettings(settings);
      res.json({ success: true, meta: buildCollectMeta(readCollectSettings()) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "保存模型源失败" });
    }
  });

  app.post("/api/collect/providers/delete", (req, res) => {
    try {
      const body = (req.body || {}) as DeleteProviderRequest;
      const providerId = String(body.id || "").trim();
      if (!providerId || providerId === DEFAULT_PROVIDER_ID) {
        return res.status(400).json({ error: "默认模型源不能删除" });
      }

      const settings = readCollectSettings();
      settings.providers = settings.providers.filter((provider) => provider.id !== providerId);
      if (parseModelOptionValue(settings.defaultModel).providerId === providerId) {
        settings.defaultModel = DEFAULT_MODEL_VALUE;
      }
      writeCollectSettings(settings);
      res.json({ success: true, meta: buildCollectMeta(readCollectSettings()) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "删除模型源失败" });
    }
  });

  app.post("/api/collect/concurrency", (req, res) => {
    try {
      const body = (req.body || {}) as UpdateConcurrencyRequest;
      const settings = readCollectSettings();
      settings.concurrency = {
        searchEnabled: Boolean(body.searchEnabled),
        applyEnabled: Boolean(body.applyEnabled),
      };
      writeCollectSettings(settings);
      res.json({ success: true, meta: buildCollectMeta(readCollectSettings()) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "保存并发配置失败" });
    }
  });

  app.post("/api/builds", (req, res) => {
    try {
      const data = Array.isArray(req.body) ? req.body.map(ensureGroupShape) : [];
      writeBuilds(data);
      res.json({ success: true });
    } catch (e) {
      console.error("API POST Error:", e);
      res.status(500).json({ error: "Failed to write data" });
    }
  });

  app.post("/api/collect/search", async (req, res) => {
    try {
      const body = (req.body || {}) as SearchRequest & { concurrent?: boolean };
      const settings = readCollectSettings();
      const guns = uniqueTrimmed(body.guns, settings.presetGuns);
      const creatorIds = ensureCreatorIds(body.creatorIds);
      const result = await searchCollectVideos(guns, creatorIds, Boolean(body.concurrent), Number(body.maxVideos) || 5);
      res.json(result);
    } catch (e) {
      console.error("API COLLECT SEARCH Error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Collect search failed" });
    }
  });

  app.post("/api/collect/search/start", async (req, res) => {
    try {
      const body = (req.body || {}) as SearchStreamRequest;
      const settings = readCollectSettings();
      const guns = uniqueTrimmed(body.guns, settings.presetGuns);
      const creatorIds = ensureCreatorIds(body.creatorIds);
      const requestId = (body.requestId || `search_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).trim();
      await runSearchCollectorStream(requestId, guns, creatorIds, Boolean(body.concurrent), Number(body.maxVideos) || 5);
      res.json({ success: true, requestId, guns, creatorIds });
    } catch (e) {
      console.error("API COLLECT SEARCH START Error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Collect search start failed" });
    }
  });

  app.get("/api/collect/search/status/:requestId", (req, res) => {
    const state = searchStreams.get(req.params.requestId || "");
    if (!state) {
      return res.status(404).json({ error: "搜索任务不存在或已过期" });
    }
    res.json({
      done: state.done,
      logs: state.logs,
      result: state.result,
      error: state.error,
    });
  });

  app.post("/api/collect/search/cancel/:requestId", (req, res) => {
    const state = searchStreams.get(req.params.requestId || "");
    if (state && state.process && !state.done) {
      state.process.kill("SIGTERM");
      state.done = true;
      state.error = "搜索已取消";
      state.logs.push({ timestamp: Date.now(), stage: "cancelled", message: "搜索已手动取消" });
      return res.json({ success: true });
    }
    res.status(404).json({ error: "任务不存在或已结束" });
  });

  app.post("/api/collect/preview", async (req, res) => {
    try {
      const body = (req.body || {}) as PreviewRequest;
      const settings = readCollectSettings();
      const guns = uniqueTrimmed(body.guns, settings.presetGuns);
      const creatorIds = ensureCreatorIds(body.creatorIds);
      const videoIds = uniqueTrimmed(body.videoIds, []);
      if (videoIds.length === 0) {
        return res.status(400).json({ error: "请选择至少一个视频" });
      }
      const preview = await previewCollectGroups(
        guns,
        creatorIds,
        videoIds,
        String(body.model || settings.defaultModel),
        Array.isArray(body.videos) ? body.videos : [],
        Boolean(body.concurrent)
      );
      res.json(preview);
    } catch (e) {
      console.error("API COLLECT PREVIEW Error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Collect preview failed" });
    }
  });

  app.post("/api/model/test", async (req, res) => {
    try {
      const body = (req.body || {}) as ModelTestRequest;
      const settings = readCollectSettings();
      const result = await testModel(String(body.model || settings.defaultModel));
      res.json(result);
    } catch (e) {
      console.error("API MODEL TEST Error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Model test failed" });
    }
  });

  app.post("/api/collect/apply", (req, res) => {
    try {
      const groups = Array.isArray(req.body?.groups) ? req.body.groups.map(ensureGroupShape) : [];
      const currentData = readBuilds();
      const nextData = mergeCollectedGroups(currentData, groups);
      writeBuilds(nextData);
      res.json({ success: true, data: nextData });
    } catch (e) {
      console.error("API COLLECT APPLY Error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Apply failed" });
    }
  });

  app.get("/api/collect/auto", (req, res) => {
    const settings = readCollectSettings();
    const logs = readAutoLogs();
    res.json({ 
      enabled: settings.autoCollect.enabled, 
      model: settings.autoCollect.model, 
      creatorIds: settings.autoCollect.creatorIds,
      intervalHours: settings.autoCollect.intervalHours,
      logs 
    });
  });

  app.post("/api/collect/auto", (req, res) => {
    try {
      const settings = readCollectSettings();
      settings.autoCollect = {
        enabled: Boolean(req.body.enabled),
        model: String(req.body.model || settings.autoCollect.model),
        creatorIds: Array.isArray(req.body.creatorIds) ? req.body.creatorIds : [],
        intervalHours: Number(req.body.intervalHours) || 1,
      };
      writeCollectSettings(settings);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "保存自动采集配置失败" });
    }
  });

  app.get("/api/config/cookie/status", (req, res) => {
    const cookiePath = path.join(__dirname, "scripts", "cookies.txt");
    if (fs.existsSync(cookiePath)) {
      const stats = fs.statSync(cookiePath);
      res.json({ exists: true, mtime: stats.mtime });
    } else {
      res.json({ exists: false });
    }
  });

  app.post("/api/config/cookie", async (req, res) => {
    try {
      const body = req.body || {};
      const content = body.content;
      if (!content) {
        return res.status(400).json({ error: "文件内容为空" });
      }
      fs.writeFileSync(path.join(__dirname, "scripts", "cookies.txt"), content, "utf-8");
      const parsed = await runCollector(["--mode", "check-cookie"]);
      res.json(parsed);
    } catch (e) {
      console.error("API COOKIE UPLOAD Error:", e);
      res.status(500).json({ success: false, message: e instanceof Error ? e.message : "测试失败" });
    }
  });

  app.get("/api/config/settings-file", (req, res) => {
    try {
      const settings = readCollectSettings();
      res.json(settings);
    } catch (e) {
      console.error("API GET settings-file Error:", e);
      res.status(500).json({ error: "Failed to read settings file" });
    }
  });

  app.get("/api/config/settings-file/status", (req, res) => {
    const settingsPath = COLLECT_SETTINGS_FILE;
    if (fs.existsSync(settingsPath)) {
      const stats = fs.statSync(settingsPath);
      res.json({ exists: true, mtime: stats.mtime });
    } else {
      res.json({ exists: false });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  let lastAutoCollectTime = 0;
  setInterval(async () => {
    const settings = readCollectSettings();
    if (!settings.autoCollect.enabled) return;
    
    const intervalMs = (settings.autoCollect.intervalHours || 1) * 60 * 60 * 1000;
    // 防止定时器漂移，增加 5 秒的宽容度
    if (Date.now() - lastAutoCollectTime < intervalMs - 5000) return;

    const creatorIds = settings.autoCollect.creatorIds;
    if (!creatorIds || creatorIds.length === 0) {
      lastAutoCollectTime = Date.now();
      addAutoLog("自动采集失败：未选择任何监听博主", false);
      return;
    }

    try {
      const ensuredModel = ensureModel(settings.autoCollect.model);
      if (!ensuredModel.provider || !ensuredModel.model) {
        lastAutoCollectTime = Date.now();
        addAutoLog("自动采集失败：未配置有效模型", false);
        return;
      }
      
      lastAutoCollectTime = Date.now();
      const args = [
        "--mode", "auto",
        "--creator-ids", creatorIds.join(","),
        "--model", ensuredModel.model,
        "--base-url", ensuredModel.provider.baseUrl,
        "--api-key", ensuredModel.provider.apiKey,
      ];
      const parsed = await runCollector(args);
      const groups = Array.isArray(parsed?.groups) ? parsed.groups.map(ensureGroupShape) : [];
      if (groups.length > 0) {
        const currentData = readBuilds();
        const nextData = mergeCollectedGroups(currentData, groups);
        writeBuilds(nextData);
        const gunNames = groups.map(g => g.name).join(", ");
        addAutoLog(`成功收集了 ${groups.length} 把枪械 (${gunNames})`, true);
      } else {
        const errs = Array.isArray(parsed?.errors) ? parsed.errors.join("; ") : "未提取到任何配置";
        addAutoLog(`未收集到新枪械：${errs}`, false);
      }
    } catch(e) {
      addAutoLog(`自动采集异常: ${e instanceof Error ? e.message : String(e)}`, false);
    }
  }, 1000 * 30); // 每 30 秒轮询一次心跳
}

startServer();
