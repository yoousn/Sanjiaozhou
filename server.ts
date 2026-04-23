import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
};

type SearchStreamRequest = {
  guns?: string[];
  creatorIds?: string[];
  requestId?: string;
};

type PreviewRequest = {
  guns?: string[];
  creatorIds?: string[];
  videoIds?: string[];
  model?: string;
};

type ModelTestRequest = {
  model?: string;
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
};

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
    tier: variant.tier || "未标注",
    price: variant.price || "未标注",
    buildType: variant.buildType || "未标注",
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
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function normalizeGunName(name: string) {
  return (name || "").trim().toLowerCase();
}

function sortVariantsNewestFirst(variants: GunVariant[]) {
  return [...variants].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
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

function uniqueTrimmed(values: string[] | undefined, fallback: string[]) {
  const items = Array.isArray(values) ? values.map((value) => value.trim()).filter(Boolean) : fallback;
  return [...new Set(items)];
}

function ensureCreatorIds(creatorIds?: string[]) {
  const allowed = new Set(CREATOR_OPTIONS.map((creator) => creator.id));
  const values = uniqueTrimmed(creatorIds, CREATOR_OPTIONS.map((creator) => creator.id)).filter((id) => allowed.has(id));
  return values.length > 0 ? values : CREATOR_OPTIONS.map((creator) => creator.id);
}

function ensureModel(model?: string) {
  return ALLOWED_MODELS.includes((model || "") as typeof ALLOWED_MODELS[number]) ? model! : DEFAULT_MODEL;
}

async function runCollector(args: string[]) {
  const { stdout } = await execFileAsync("python", [COLLECT_SCRIPT, ...args], {
    cwd: __dirname,
    maxBuffer: 1024 * 1024 * 20,
    encoding: "utf8",
  });

  const parsed = parseCollectorJson(stdout);
  return parsed;
}

async function runSearchCollectorStream(requestId: string, guns: string[], creatorIds: string[]) {
  const state: SearchStreamState = { logs: [], done: false };
  searchStreams.set(requestId, state);

  const child = spawn("python", [COLLECT_SCRIPT, "--mode", "search", "--guns", guns.join(","), "--creator-ids", creatorIds.join(",")], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

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

async function searchCollectVideos(guns: string[], creatorIds: string[]) {
  const parsed = await runCollector([
    "--mode",
    "search",
    "--guns",
    guns.join(","),
    "--creator-ids",
    creatorIds.join(","),
  ]);

  return buildSearchResponse(parsed, guns, creatorIds);
}

async function previewCollectGroups(guns: string[], creatorIds: string[], videoIds: string[], model: string): Promise<CollectPreview> {
  const parsed = await runCollector([
    "--mode",
    "preview",
    "--guns",
    guns.join(","),
    "--creator-ids",
    creatorIds.join(","),
    "--video-ids",
    videoIds.join(","),
    "--model",
    model,
  ]);

  return {
    success: Boolean(parsed?.success),
    model: parsed?.model || model,
    target_guns: Array.isArray(parsed?.target_guns) ? parsed.target_guns : guns,
    creatorIds,
    videoIds,
    groups: Array.isArray(parsed?.groups) ? parsed.groups.map(ensureGroupShape) : [],
    logs: Array.isArray(parsed?.logs) ? parsed.logs : [],
    errors: Array.isArray(parsed?.errors) ? parsed.errors.map(String) : [],
  };
}

async function testModel(model: string) {
  const parsed = await runCollector([
    "--mode",
    "test-model",
    "--model",
    model,
  ]);

  return {
    model,
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
    res.json({
      creators: CREATOR_OPTIONS,
      models: ALLOWED_MODELS,
      defaultModel: DEFAULT_MODEL,
      defaultGuns: DEFAULT_COLLECT_GUNS,
    });
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
      const body = (req.body || {}) as SearchRequest;
      const guns = uniqueTrimmed(body.guns, DEFAULT_COLLECT_GUNS);
      const creatorIds = ensureCreatorIds(body.creatorIds);
      const result = await searchCollectVideos(guns, creatorIds);
      res.json(result);
    } catch (e) {
      console.error("API COLLECT SEARCH Error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Collect search failed" });
    }
  });

  app.post("/api/collect/search/start", async (req, res) => {
    try {
      const body = (req.body || {}) as SearchStreamRequest;
      const guns = uniqueTrimmed(body.guns, DEFAULT_COLLECT_GUNS);
      const creatorIds = ensureCreatorIds(body.creatorIds);
      const requestId = (body.requestId || `search_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).trim();
      await runSearchCollectorStream(requestId, guns, creatorIds);
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

  app.post("/api/collect/preview", async (req, res) => {
    try {
      const body = (req.body || {}) as PreviewRequest;
      const guns = uniqueTrimmed(body.guns, DEFAULT_COLLECT_GUNS);
      const creatorIds = ensureCreatorIds(body.creatorIds);
      const videoIds = uniqueTrimmed(body.videoIds, []);
      if (videoIds.length === 0) {
        return res.status(400).json({ error: "请选择至少一个视频" });
      }
      const preview = await previewCollectGroups(guns, creatorIds, videoIds, ensureModel(body.model));
      res.json(preview);
    } catch (e) {
      console.error("API COLLECT PREVIEW Error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Collect preview failed" });
    }
  });

  app.post("/api/model/test", async (req, res) => {
    try {
      const body = (req.body || {}) as ModelTestRequest;
      const result = await testModel(ensureModel(body.model));
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
}

startServer();
