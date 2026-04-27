import busboy from "busboy";
import type { IncomingMessage } from "http";

const CF_UPLOAD_URL = process.env.CF_UPLOAD_URL || "https://img.yousn.me/";
const CF_AUTH_TOKEN = process.env.CF_AUTH_TOKEN || "";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export type UploadResult = {
  success: boolean;
  url?: string;
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
  if (!CF_AUTH_TOKEN) {
    return { success: false, error: "图床服务未配置" };
  }

  const formData = new FormData();
  const ext = filename.split(".").pop() || "png";
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  formData.append("file", blob, `community_${Date.now()}.${ext}`);

  try {
    const res = await fetch(CF_UPLOAD_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_AUTH_TOKEN}` },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.error || `上传失败 (${res.status})` };
    }
    const url = typeof data?.url === "string" ? data.url : (typeof data?.imageUrl === "string" ? data.imageUrl : "");
    if (!url) {
      return { success: false, error: "图床未返回图片地址" };
    }
    return { success: true, url };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "图床上传异常" };
  }
}
