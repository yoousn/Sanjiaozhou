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
    const models = await fetchModelsFromProvider(String(body.baseUrl || ""), String(body.apiKey || ""));
    res.json({ success: true, models });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "获取模型列表失败" });
  }
});

router.post("/providers", (req, res) => {
  try {
    const body = req.body || {};
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

    const nextProviders = settings.providers.filter((item) => item.id !== provider.id);
    settings.providers = [provider, ...nextProviders];
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
      creatorIds: Array.isArray(req.body.creatorIds) ? req.body.creatorIds : [],
      intervalHours: Number(req.body.intervalHours) || 1,
    };
    writeCollectSettings(settings);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "保存自动采集配置失败" });
  }
});

export function startAutoCollectJob() {
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

export default router;
