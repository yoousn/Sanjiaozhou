import busboy from "busboy";
import type { IncomingMessage } from "http";
import sharp from "sharp";
import { logger } from "./logger.js";

const CF_UPLOAD_URL = process.env.CF_UPLOAD_URL;
const CF_AUTH_TOKEN = process.env.CF_AUTH_TOKEN;

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export type UploadResult = {
  success: boolean;
  url?: string;
  thumbUrl?: string;
  error?: string;
};

export function parseUploadFile(req: IncomingMessage): Promise<{ buffer: Buffer; mimetype: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE } });
    let resolved = false;

    bb.on("file", (fieldname: string, file: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
      const mimetype = info.mimeType;
      if (!ALLOWED_TYPES.includes(mimetype)) {
        resolved = true;
        reject(new Error(`不支持的文件类型: ${mimetype}，仅支持 PNG/JPEG/GIF/WebP`));
        return;
      }

      const chunks: Buffer[] = [];
      file.on("data", (chunk: Buffer) => chunks.push(chunk));
      file.on("end", () => {
        if (resolved) return;
        resolved = true;
        const buffer = Buffer.concat(chunks);
        if (buffer.length === 0) {
          reject(new Error("上传的文件为空"));
          return;
        }
        resolve({ buffer, mimetype, filename: info.filename });
      });
      file.on("error", (err) => {
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });
    });

    bb.on("filesLimit", () => {
      if (!resolved) {
        resolved = true;
        reject(new Error("文件过大，最大允许 10MB"));
      }
    });

    bb.on("error", (err: Error) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    bb.on("finish", () => {
      if (!resolved) {
        resolved = true;
        reject(new Error("未找到上传文件"));
      }
    });

    req.pipe(bb);
  });
}

export async function uploadToCF(buffer: Buffer, filename: string): Promise<UploadResult> {
  if (!CF_UPLOAD_URL || !CF_AUTH_TOKEN) {
    return { success: false, error: "图床服务未配置" };
  }

  try {
    // 压缩逻辑：如果是 GIF，尝试保留动画；其他格式压成 WebP，限制最大宽度 1920
    const isGif = filename.toLowerCase().endsWith(".gif");
    let processedBuffer = buffer;
    let finalExt = isGif ? "gif" : "webp";

    if (!isGif) {
      processedBuffer = await sharp(buffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    }

    const ts = Date.now();
    const key = `community_${ts}.${finalExt}`;
    const thumbKey = `community_${ts}_thumb.webp`;
    const baseUrl = CF_UPLOAD_URL.replace(/\/+$/, "");
    const url = `${baseUrl}/${key}`;

    // 上传原图
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: CF_AUTH_TOKEN,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(processedBuffer),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, error: `上传失败 (${res.status}): ${text.slice(0, 200)}` };
    }

    // 生成并上传缩略图（非 GIF：320px 宽 WebP q70；GIF 不生成缩略图）
    let thumbUrl = url; // 默认缩略图 = 原图
    if (!isGif) {
      try {
        const thumbBuffer = await sharp(buffer)
          .resize({ width: 480, withoutEnlargement: true })
          .webp({ quality: 70 })
          .toBuffer();
        const thumbRes = await fetch(`${baseUrl}/${thumbKey}`, {
          method: "PUT",
          headers: {
            Authorization: CF_AUTH_TOKEN,
            "Content-Type": "application/octet-stream",
          },
          body: new Uint8Array(thumbBuffer),
        });
        if (thumbRes.ok) {
          thumbUrl = `${baseUrl}/${thumbKey}`;
        }
      } catch {
        // 缩略图生成失败不影响主流程
      }
    }

    return { success: true, url, thumbUrl };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "图床上传异常" };
  }
}

export async function deleteFromCF(imageUrl: string): Promise<boolean> {
  if (!CF_AUTH_TOKEN) {
    return false;
  }
  
  try {
    const res = await fetch(imageUrl, {
      method: "DELETE",
      headers: {
        Authorization: CF_AUTH_TOKEN,
      },
    });
    return res.ok;
  } catch (e) {
    logger.error("图床图片删除异常", { error: e instanceof Error ? e.message : String(e) });
    return false;
  }
}

