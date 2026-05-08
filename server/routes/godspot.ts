import fs from "fs";
import path from "path";
import { Router } from "express";
import busboy from "busboy";
import type { IncomingMessage } from "http";
import { requireAuth } from "../lib/auth.js";
import { rateLimit } from "../lib/rateLimiter.js";
import { ALLOWED_GODSPOT_VIDEO_TYPES, getGodspotConfig } from "../lib/godspotConfig.js";
import { buildGodspotObjectKey, createGodspotVideo, deleteGodspotVideo, GODSPOT_MAPS, queryGodspotVideos } from "../lib/godspotStore.js";
import { storeObject } from "../lib/godspotStorage.js";
import { logger } from "../lib/logger.js";

const router = Router();

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sanitizeDisplayName(value: unknown, fallback: string) {
  const text = String(value || "").trim().slice(0, 80);
  return text || fallback || "未命名视频";
}

function normalizeMapName(value: unknown) {
  const mapName = String(value || "").trim();
  return (GODSPOT_MAPS as readonly string[]).includes(mapName) ? mapName : GODSPOT_MAPS[0];
}

function extractBilibiliUrl(value: unknown) {
  const text = String(value || "").trim();
  const match = text.match(/https?:\/\/(?:www\.)?(?:bilibili\.com\/video\/[A-Za-z0-9?=&_./%-]+|b23\.tv\/[A-Za-z0-9]+)/i);
  return match?.[0] || "";
}

function normalizeBilibiliImageUrl(value: string): string {
  const url = cleanBilibiliCoverUrl(value).replace(/&amp;/g, "&");
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url.replace(/^http:\/\//i, "https://");
}

function extractDouyinUrl(value: unknown) {
  const text = String(value || "").trim();
  // 支持: douyin.com/video/xxx, douyin.com/jingxuan?modal_id=xxx, v.douyin.com/xxx
  const match = text.match(/https?:\/\/(?:www\.)?(?:douyin\.com\/(?:video\/\d+|jingxuan\?modal_id=\d+|jingxuan[^\s]*)|v\.douyin\.com\/[A-Za-z0-9_\/-]+)/i);
  return match?.[0] || "";
}

function extractDouyinVideoId(value: unknown) {
  const text = String(value || "");
  return text.match(/douyin\.com\/video\/(\d+)/i)?.[1]
    || text.match(/[?&]modal_id=(\d+)/i)?.[1]
    || "";
}

function cleanDouyinTitle(value: unknown) {
  return String(value || "")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s*-\s*抖音.*$/i, "")
    .replace(/^抖音\s*-\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function extractDouyinTitleFromShareText(value: unknown) {
  const text = String(value || "").replace(/https?:\/\/\S+/g, " ").replace(/\s+/g, " ").trim();
  const bracketTitle = text.match(/【([^】]{2,100})】/)?.[1];
  return cleanDouyinTitle(bracketTitle || text.replace(/^\S+\s*复制打开抖音，看看/, ""));
}

function normalizeExternalCoverUrl(raw: string): string {
  const url = String(raw || "").replace(/\\u002F/g, "/").replace(/&amp;/g, "&").trim();
  const match = url.match(/https?:\/\/[^"'\\\s<>]+/i) || url.match(/\/\/[^"'\\\s<>]+/i);
  if (!match) return "";
  const normalized = match[0].startsWith("//") ? `https:${match[0]}` : match[0];
  return normalized.replace(/^http:\/\//i, "https://");
}

function proxiedCoverUrl(value: string) {
  const url = normalizeExternalCoverUrl(value);
  return url ? `/api/godspot/cover-proxy?url=${encodeURIComponent(url)}` : "";
}

function ensureExternalCoverUrl(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.startsWith("/api/godspot/cover-proxy?")) return text;
  return proxiedCoverUrl(text);
}

async function fetchBilibiliCoverByBvid(bvid: string) {
  if (!bvid) return "";
  try {
    const apiRes = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!apiRes.ok) return "";
    const apiData = await apiRes.json() as any;
    return apiData?.data?.pic ? proxiedCoverUrl(String(apiData.data.pic)) : "";
  } catch {
    return "";
  }
}

function detectExternalPlatform(value: unknown): "bilibili" | "douyin" | null {
  const text = String(value || "");
  if (/bilibili\.com|b23\.tv/i.test(text)) return "bilibili";
  if (/douyin\.com/i.test(text)) return "douyin";
  return null;
}

function extractBvid(value: unknown): string {
  const text = String(value || "").trim();
  const match = text.match(/BV[A-Za-z0-9]{10,}/);
  return match?.[0] || "";
}

function cleanBilibiliTitle(value: unknown) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/_哔哩哔哩_bilibili.*$/i, "")
    .replace(/- 哔哩哔哩.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function cleanBilibiliCoverUrl(raw: string): string {
  const match = raw.match(/https?:\/\/[^"'\s]+/i);
  return match?.[0] || "";
}

async function fetchBilibiliPage(url: string): Promise<{ title: string; url: string; bvid: string; coverUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://www.bilibili.com",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });
    const finalUrl = res.url;
    const html = await res.text();
    const bvid = extractBvid(finalUrl) || extractBvid(html) || "";

    const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i)?.[1]
      || html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    const title = cleanBilibiliTitle(ogTitle || "");

    let coverUrl = "";
    const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i)?.[1];
    if (ogImage) {
      coverUrl = normalizeBilibiliImageUrl(ogImage);
    }

    // 如果 HTML 解析没拿到封面，尝试用 B 站 API 获取
    if (!coverUrl && bvid) {
      try {
        const apiRes = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
          signal: AbortSignal.timeout(5000),
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json() as any;
          if (apiData?.data?.pic) {
            coverUrl = normalizeBilibiliImageUrl(String(apiData.data.pic).trim());
          }
        }
      } catch {
        // API 失败不影响主流程
      }
    }

    const canonicalUrl = bvid ? `https://www.bilibili.com/video/${bvid}` : finalUrl;
    return { title, url: canonicalUrl, bvid, coverUrl };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDouyinPage(url: string, fallbackText = ""): Promise<{ title: string; url: string; coverUrl: string }> {
  const videoId = extractDouyinVideoId(url) || extractDouyinVideoId(fallbackText);
  const canonicalUrl = videoId ? `https://www.douyin.com/video/${videoId}` : url;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(canonicalUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://www.douyin.com/",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });
    const html = await res.text();

    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i)?.[1]
      || html.match(/["']desc["']\s*:\s*["']([^"']{2,160})["']/i)?.[1]
      || html.match(/["']description["']\s*:\s*["']([^"']{2,160})["']/i)?.[1]
      || titleMatch?.[1];
    const title = cleanDouyinTitle(ogTitle) || extractDouyinTitleFromShareText(fallbackText);

    const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i)?.[1]
      || html.match(/["']cover["']\s*:\s*["']([^"']+)["']/i)?.[1]
      || html.match(/["']origin_cover["']\s*:\s*["']([^"']+)["']/i)?.[1]
      || html.match(/["']cover_url["']\s*:\s*["']([^"']+)["']/i)?.[1];
    const coverUrl = proxiedCoverUrl(ogImage || "");

    return { title, url: canonicalUrl || res.url, coverUrl };
  } catch {
    return { title: extractDouyinTitleFromShareText(fallbackText), url: canonicalUrl, coverUrl: "" };
  } finally {
    clearTimeout(timer);
  }
}

type ParsedVideoUpload = {
  tempPath: string;
  filename: string;
  mimeType: string;
  size: number;
  fields: Record<string, string>;
};

function parseVideoUpload(req: IncomingMessage): Promise<ParsedVideoUpload> {
  const config = getGodspotConfig();
  ensureDir(config.tempDir);

  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers, limits: { fileSize: config.maxFileSize, files: 1, fields: 8 } });
    const fields: Record<string, string> = {};
    let tempPath = "";
    let filename = "";
    let mimeType = "";
    let size = 0;
    let fileFound = false;
    let settled = false;

    const cleanup = () => {
      if (tempPath && fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    bb.on("field", (name, value) => {
      fields[String(name)] = String(value || "").trim();
    });

    bb.on("file", (_fieldname: string, file: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
      if (fileFound) {
        file.resume();
        return;
      }
      fileFound = true;
      filename = info.filename || "video.mp4";
      mimeType = info.mimeType || "application/octet-stream";

      if (!(ALLOWED_GODSPOT_VIDEO_TYPES as readonly string[]).includes(mimeType)) {
        file.resume();
        fail(new Error(`不支持的视频类型: ${mimeType}，仅支持 MP4/WebM/MOV/MKV/AVI`));
        return;
      }

      tempPath = path.join(config.tempDir, `godspot_${Date.now()}_${Math.random().toString(36).slice(2)}.upload`);
      const writer = fs.createWriteStream(tempPath);

      file.on("data", (chunk: Buffer) => {
        size += chunk.length;
      });
      file.on("limit", () => {
        file.unpipe(writer);
        writer.destroy();
        fail(new Error(`视频过大，最大允许 ${Math.round(config.maxFileSize / 1024 / 1024)}MB`));
      });
      file.on("error", fail);
      writer.on("error", fail);
      writer.on("finish", () => {
        if (settled) return;
        if (size <= 0) {
          fail(new Error("上传的视频文件为空"));
          return;
        }
      });
      file.pipe(writer);
    });

    bb.on("error", fail);
    bb.on("finish", () => {
      if (settled) return;
      if (!fileFound || !tempPath) {
        fail(new Error("未找到上传视频"));
        return;
      }
      settled = true;
      resolve({ tempPath, filename, mimeType, size, fields });
    });

    req.pipe(bb);
  });
}

router.get("/cover-proxy", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();
    if (!/^https?:\/\//i.test(url)) return res.status(400).end();
    const host = new URL(url).hostname;
    if (!/(^|\.)(hdslb\.com|biliimg\.com|douyinpic\.com|douyinstatic\.com|douyincdn\.com|snssdk\.com)$/i.test(host)) {
      return res.status(403).end();
    }

    const upstream = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: host.includes("bili") || host.includes("hdslb") ? "https://www.bilibili.com/" : "https://www.douyin.com/",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    if (!upstream.ok || !upstream.body) return res.status(upstream.status || 404).end();
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.send(buffer);
  } catch {
    res.status(404).end();
  }
});

router.get("/videos", async (req, res) => {
  try {
    const mapName = typeof req.query.mapName === "string" ? req.query.mapName : undefined;
    const videos = await Promise.all(queryGodspotVideos(mapName).map(async (video) => ({
      ...video,
      coverUrl: video.coverUrl ? ensureExternalCoverUrl(video.coverUrl) : video.sourceType === "bilibili" && video.bvid ? await fetchBilibiliCoverByBvid(video.bvid) : video.coverUrl,
    })));
    res.json({ success: true, data: videos, maps: ["全部", ...GODSPOT_MAPS] });
  } catch (e) {
    logger.error("API GODSPOT GET VIDEOS Error", { error: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ success: false, error: "获取神人点位视频失败" });
  }
});

router.post("/resolve-external", requireAuth, rateLimit(30, 60 * 60 * 1000, "链接识别过于频繁，请 1 小时后再试"), async (req, res) => {
  try {
    const rawUrl = String(req.body?.url || "").trim();
    const platform = detectExternalPlatform(rawUrl);
    if (!platform) return res.status(400).json({ success: false, error: "请粘贴有效的 B 站或抖音视频链接" });

    if (platform === "bilibili") {
      let url = extractBilibiliUrl(rawUrl);
      if (!url) return res.status(400).json({ success: false, error: "请粘贴有效的 B 站视频链接" });

      // 处理 b23.tv 短链
      if (/b23\.tv/i.test(url)) {
        try {
          const redirectRes = await fetch(url, {
            method: "HEAD",
            redirect: "follow",
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          });
          url = redirectRes.url || url;
        } catch { /* fallback */ }
      }

      const result = await fetchBilibiliPage(url);
      if (!result.title) return res.status(400).json({ success: false, error: "未识别到视频标题，请手动填写" });
      if (!result.bvid) return res.status(400).json({ success: false, error: "未识别到 BV 号，请确认链接有效" });
      return res.json({ success: true, data: { ...result, platform: "bilibili" } });
    }

    // douyin
    let url = extractDouyinUrl(rawUrl) || rawUrl;
    if (!url) return res.status(400).json({ success: false, error: "请粘贴有效的抖音视频链接" });

    const result = await fetchDouyinPage(url, rawUrl);
    if (!result.title) return res.status(400).json({ success: false, error: "未识别到视频标题，请手动填写" });

    res.json({ success: true, data: { ...result, platform: "douyin" } });
  } catch (e) {
    logger.error("API GODSPOT RESOLVE EXTERNAL Error", { error: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ success: false, error: "识别链接失败，请手动填写标题" });
  }
});

router.post("/save-external", requireAuth, rateLimit(20, 60 * 60 * 1000, "操作过于频繁，请 1 小时后再试"), async (req, res) => {
  try {
    const { url, displayName, mapName } = req.body || {};
    const rawUrl = String(url || "").trim();
    if (!rawUrl) return res.status(400).json({ success: false, error: "请提供有效的视频链接" });

    const platform = detectExternalPlatform(rawUrl);
    if (!platform) return res.status(400).json({ success: false, error: "仅支持 B 站或抖音链接" });

    if (platform === "bilibili") {
      const biliUrl = extractBilibiliUrl(rawUrl) || rawUrl;
      let bvid = extractBvid(biliUrl);
      let title = "";
      let coverUrl = "";

      // 始终尝试获取封面和标题
      try {
        const result = await fetchBilibiliPage(bvid ? `https://www.bilibili.com/video/${bvid}` : biliUrl);
        bvid = result.bvid || bvid;
        title = result.title;
        coverUrl = result.coverUrl ? ensureExternalCoverUrl(result.coverUrl) : resolveBilibiliCoverFromBvid(bvid);
      } catch { /* 静默 */ }

      if (!bvid) return res.status(400).json({ success: false, error: "无法识别 BV 号，请确认链接有效" });

      const user = (req as any).authUser;
      const video = createGodspotVideo({
        displayName: sanitizeDisplayName(displayName || title, `B站视频_${bvid}`),
        mapName: normalizeMapName(mapName),
        originalFilename: bvid,
        mimeType: "text/html",
        size: 0,
        videoKey: bvid,
        videoUrl: "",
        storageType: "external",
        sourceType: "bilibili",
        sourceUrl: `https://www.bilibili.com/video/${bvid}`,
        bvid,
        coverUrl: coverUrl || undefined,
        uploader: user?.username || "匿名",
      });
      return res.json({ success: true, data: video });
    }

    // douyin
    const dyUrl = extractDouyinUrl(rawUrl) || rawUrl;
    let title = "";
    let coverUrl = "";
    try {
      const result = await fetchDouyinPage(dyUrl, rawUrl);
      title = result.title;
      coverUrl = result.coverUrl;
    } catch { /* 静默 */ }

    const user = (req as any).authUser;
    const videoKey = `dy_${Date.now()}`;
    const video = createGodspotVideo({
      displayName: sanitizeDisplayName(displayName || title, `抖音视频`),
      mapName: normalizeMapName(mapName),
      originalFilename: videoKey,
      mimeType: "text/html",
      size: 0,
      videoKey,
      videoUrl: "",
      storageType: "external",
      sourceType: "douyin",
      sourceUrl: dyUrl,
      coverUrl: coverUrl || undefined,
      uploader: user?.username || "匿名",
    });
    res.json({ success: true, data: video });
  } catch (e) {
    const message = e instanceof Error ? e.message : "保存视频异常";
    logger.error("API GODSPOT SAVE EXTERNAL Error", { error: message });
    res.status(500).json({ success: false, error: message });
  }
});

router.post("/upload", requireAuth, rateLimit(10, 60 * 60 * 1000, "上传请求过于频繁，请 1 小时后再试"), async (req, res) => {
  let parsed: ParsedVideoUpload | null = null;
  try {
    const ct = req.headers["content-type"] || "";
    if (!String(ct).includes("multipart/form-data")) {
      return res.status(400).json({ success: false, error: "请使用 multipart/form-data 上传视频" });
    }

    parsed = await parseVideoUpload(req);
    const videoKey = buildGodspotObjectKey(parsed.filename);
    const stored = await storeObject(parsed.tempPath, videoKey, parsed.mimeType);
    if (!stored.success || !stored.key || !stored.url) {
      return res.status(500).json({ success: false, error: stored.error || "视频存储失败" });
    }

    const user = (req as any).authUser;
    const video = createGodspotVideo({
      displayName: sanitizeDisplayName(parsed.fields.displayName, parsed.filename),
      mapName: normalizeMapName(parsed.fields.mapName),
      originalFilename: parsed.filename,
      mimeType: parsed.mimeType,
      size: stored.size || parsed.size,
      videoKey: stored.key,
      videoUrl: stored.url,
      storageType: stored.storageType,
      sourceType: "upload",
      uploader: user?.username || "匿名",
    });

    res.json({ success: true, data: video });
  } catch (e) {
    const message = e instanceof Error ? e.message : "视频上传异常";
    logger.error("API GODSPOT UPLOAD Error", { error: message });
    res.status(500).json({ success: false, error: message });
  } finally {
    if (parsed?.tempPath && fs.existsSync(parsed.tempPath)) {
      try { fs.unlinkSync(parsed.tempPath); } catch {}
    }
  }
});

router.delete("/videos/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await deleteGodspotVideo(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: "视频不存在" });
    res.json({ success: true });
  } catch (e) {
    logger.error("API GODSPOT DELETE Error", { error: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ success: false, error: "删除视频失败" });
  }
});

export default router;
