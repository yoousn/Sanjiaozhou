import { Router } from "express";
import { 
  buildCollectMeta, 
  readCollectSettings, 
  writeCollectSettings, 
  DEFAULT_PRESET_GUNS,
  sanitizeProvider,
  buildModelOptionValue,
  parseModelOptionValue
} from "../lib/collectSettings.js";
import { 
  fetchModelsFromProvider, 
  searchCollectVideos, 
  runSearchCollectorStream, 
  searchStreams,
  previewCollectGroups,
  ensureCreatorIds,
  ensureModel,
  normalizeProviderBaseUrl,
  runCollector
} from "../lib/collector.js";
import { trimUniqueStrings, ensureGroupShape } from "../lib/shape.js";
import { uniqueTrimmed, mergeCollectedGroups } from "../lib/merge.js";
import { readBuilds, writeBuilds } from "./builds.js";
import { readAutoLogs, addAutoLog } from "../lib/logs.js";

const router = Router();

router.get("/meta", (req, res) => {
  res.json(buildCollectMeta(readCollectSettings()));
});

router.post("/preset-guns", (req, res) => {
  try {
    const body = req.body || {};
    const settings = readCollectSettings();
    settings.presetGuns = trimUniqueStrings(body.presetGuns, DEFAULT_PRESET_GUNS);
    writeCollectSettings(settings);
    res.json({ success: true, meta: buildCollectMeta(readCollectSettings()) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "保存预设枪械失败" });
  }
});

router.post("/providers/fetch-models", async (req, res) => {
  try {
    const body = req.body || {};
    const baseUrl = String(body.baseUrl || "").trim();
    if (!baseUrl) {
      return res.status(400).json({ error: "请填写接口地址" });
    }
    const models = await fetchModelsFromProvider(baseUrl, String(body.apiKey || ""));
    if (models.length === 0) {
      return res.status(400).json({ error: "接口未返回可用模型，请检查接口地址或 API Key" });
    }
    res.json({ success: true, models });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "获取模型列表失败" });
  }
});

router.post("/providers", (req, res) => {
  try {
    const body = req.body || {};
    const settings = readCollectSettings();
    const existingProvider = body.id ? settings.providers.find((item) => item.id === String(body.id)) : undefined;
    const provider = sanitizeProvider({
      id: body.id,
      name: body.name,
      baseUrl: body.baseUrl,
      apiKey: String(body.apiKey || "").trim() || existingProvider?.apiKey || "",
      models: body.models,
    }, body.id);

    if (!provider.baseUrl) {
      return res.status(400).json({ error: "请填写接口地址" });
    }
    if (provider.models.length === 0) {
      return res.status(400).json({ error: "请先获取模型" });
    }

    const nextProviders = settings.providers.filter((item) => item.id !== provider.id);
    settings.providers = [provider, ...nextProviders];
    const defaultModel = body.defaultModel && provider.models.includes(String(body.defaultModel))
      ? buildModelOptionValue(provider.id, String(body.defaultModel))
      : (settings.defaultModel && parseModelOptionValue(settings.defaultModel).providerId !== provider.id ? settings.defaultModel : buildModelOptionValue(provider.id, provider.models[0]));
    settings.defaultModel = defaultModel;
    writeCollectSettings(settings);
    res.json({ success: true, defaultModel: parseModelOptionValue(defaultModel).model, meta: buildCollectMeta(readCollectSettings()) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "保存模型源失败" });
  }
});

router.post("/providers/delete", (req, res) => {
  try {
    const body = req.body || {};
    const providerId = String(body.id || "").trim();
    if (!providerId) {
      return res.status(400).json({ error: "请选择模型源" });
    }

    const settings = readCollectSettings();
    settings.providers = settings.providers.filter((provider) => provider.id !== providerId);
    if (parseModelOptionValue(settings.defaultModel).providerId === providerId) {
      const fallbackProvider = settings.providers[0];
      settings.defaultModel = fallbackProvider?.models[0] ? buildModelOptionValue(fallbackProvider.id, fallbackProvider.models[0]) : "";
    }
    writeCollectSettings(settings);
    res.json({ success: true, meta: buildCollectMeta(readCollectSettings()) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "删除模型源失败" });
  }
});

router.post("/concurrency", (req, res) => {
  try {
    const body = req.body || {};
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

router.post("/search", async (req, res) => {
  try {
    const body = req.body || {};
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

router.post("/search/start", async (req, res) => {
  try {
    const body = req.body || {};
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

router.get("/search/status/:requestId", (req, res) => {
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

router.post("/search/cancel/:requestId", (req, res) => {
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

router.post("/preview", async (req, res) => {
  try {
    const body = req.body || {};
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

router.post("/apply", (req, res) => {
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

router.get("/auto", (req, res) => {
  const settings = readCollectSettings();
  const logs = readAutoLogs();
  res.json({ 
    enabled: settings.autoCollect.enabled, 
    model: settings.autoCollect.model,
    backupModel: settings.autoCollect.backupModel,
    creatorIds: settings.autoCollect.creatorIds,
    intervalHours: settings.autoCollect.intervalHours,
    logs 
  });
});

router.post("/auto", (req, res) => {
  try {
    const settings = readCollectSettings();
    settings.autoCollect = {
      enabled: Boolean(req.body.enabled),
      model: String(req.body.model || settings.autoCollect.model),
      backupModel: String(req.body.backupModel || ""),
      creatorIds: Array.isArray(req.body.creatorIds) ? req.body.creatorIds : [],
      intervalHours: Number(req.body.intervalHours) || 1,
    };
    writeCollectSettings(settings);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "保存自动采集配置失败" });
  }
});

type AutoCollectRetryState = {
  videos: any[];
  nextRunAt: number;
  errors: string[];
};

const AUTO_COLLECT_RETRY_DELAY_MS = 5 * 60 * 1000;

function buildAutoCollectArgs(modelValue: string, creatorIds: string[], videos: any[] = []) {
  const ensuredModel = ensureModel(modelValue);
  if (!ensuredModel.provider || !ensuredModel.model) return null;
  const args = [
    "--mode", "auto",
    "--creator-ids", creatorIds.join(","),
    "--model", ensuredModel.model,
    "--base-url", normalizeProviderBaseUrl(ensuredModel.provider.baseUrl),
    "--api-key", ensuredModel.provider.apiKey,
  ];
  if (videos.length > 0) {
    args.push("--videos-json", JSON.stringify(videos));
  }
  return { args, model: ensuredModel.model };
}

async function runAutoCollectAttempt(modelValue: string, creatorIds: string[], videos: any[] = []) {
  const built = buildAutoCollectArgs(modelValue, creatorIds, videos);
  if (!built) {
    return { parsed: null, groups: [], errors: ["未配置有效模型"], model: modelValue };
  }
  const parsed = await runCollector(built.args);
  return {
    parsed,
    groups: Array.isArray(parsed?.groups) ? parsed.groups.map(ensureGroupShape) : [],
    errors: Array.isArray(parsed?.errors) ? parsed.errors.map(String).filter(Boolean) : [],
    model: built.model,
  };
}

export function startAutoCollectJob() {
  let lastAutoCollectTime = 0;
  let retryState: AutoCollectRetryState | null = null;
  setInterval(async () => {
    const settings = readCollectSettings();
    if (!settings.autoCollect.enabled) return;
    
    const intervalMs = (settings.autoCollect.intervalHours || 1) * 60 * 60 * 1000;
    const hasDueRetry = Boolean(retryState && retryState.nextRunAt <= Date.now());
    if (!hasDueRetry && Date.now() - lastAutoCollectTime < intervalMs - 5000) return;

    const creatorIds = settings.autoCollect.creatorIds;
    if (!creatorIds || creatorIds.length === 0) {
      lastAutoCollectTime = Date.now();
      addAutoLog("自动采集失败：未选择任何监听博主", false);
      return;
    }

    try {
      const retryVideos = hasDueRetry ? retryState?.videos || [] : [];
      lastAutoCollectTime = Date.now();
      const primary = await runAutoCollectAttempt(settings.autoCollect.model, creatorIds, retryVideos);
      let finalResult = primary;
      if (primary.groups.length === 0 && settings.autoCollect.backupModel) {
        addAutoLog(`主模型采集失败，正在切换备用模型：${primary.errors.join("; ") || "未提取到任何配置"}`, false);
        finalResult = await runAutoCollectAttempt(settings.autoCollect.backupModel, creatorIds, retryVideos);
      }
      const groups = finalResult.groups;
      if (groups.length > 0) {
        const currentData = readBuilds();
        const nextData = mergeCollectedGroups(currentData, groups);
        writeBuilds(nextData);
        const gunNames = groups.map(g => g.name).join(", ");
        retryState = null;
        addAutoLog(`成功收集了 ${groups.length} 把枪械 (${gunNames})`, true);
      } else {
        const videos = Array.isArray(finalResult.parsed?.videos) ? finalResult.parsed.videos : retryVideos;
        const errors = [...primary.errors, ...(finalResult === primary ? [] : finalResult.errors)].filter(Boolean);
        if (videos.length > 0) {
          retryState = { videos, errors, nextRunAt: Date.now() + AUTO_COLLECT_RETRY_DELAY_MS };
          addAutoLog(`模型采集失败，5分钟后重试 ${videos.length} 条视频：${errors.join("; ") || "未提取到任何配置"}`, false);
        } else {
          retryState = null;
          addAutoLog(`未收集到新枪械：${errors.join("; ") || "未提取到任何配置"}`, false);
        }
      }
    } catch(e) {
      const message = e instanceof Error ? e.message : String(e);
      if (retryState?.videos.length) {
        retryState = { ...retryState, nextRunAt: Date.now() + AUTO_COLLECT_RETRY_DELAY_MS, errors: [message] };
      }
      addAutoLog(`自动采集异常: ${message}`, false);
    }
  }, 1000 * 30); // 每 30 秒轮询一次心跳
}

export default router;
