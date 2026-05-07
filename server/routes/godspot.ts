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

function cleanBilibiliTitle(value: unknown) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/_哔哩哔哩_bilibili.*$/i, "")
    .replace(/- 哔哩哔哩.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

async function fetchBilibiliTitle(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://www.bilibili.com",
      },
    });
    const html = await res.text();
    const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i)?.[1]
      || html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    return cleanBilibiliTitle(ogTitle);
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

router.get("/videos", (req, res) => {
  try {
    const mapName = typeof req.query.mapName === "string" ? req.query.mapName : undefined;
    res.json({ success: true, data: queryGodspotVideos(mapName), maps: ["全部", ...GODSPOT_MAPS] });
  } catch (e) {
    logger.error("API GODSPOT GET VIDEOS Error", { error: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ success: false, error: "获取神人点位视频失败" });
  }
});

router.post("/resolve-bilibili", requireAuth, rateLimit(30, 60 * 60 * 1000, "链接识别过于频繁，请 1 小时后再试"), async (req, res) => {
  try {
    const url = extractBilibiliUrl(req.body?.url);
    if (!url) return res.status(400).json({ success: false, error: "请粘贴有效的 B 站视频链接" });

    const title = await fetchBilibiliTitle(url);
    if (!title) return res.status(400).json({ success: false, error: "未识别到视频标题，请手动填写" });

    res.json({ success: true, data: { title, url } });
  } catch (e) {
    logger.error("API GODSPOT RESOLVE BILIBILI Error", { error: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ success: false, error: "识别 B 站链接失败，请手动填写标题" });
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
