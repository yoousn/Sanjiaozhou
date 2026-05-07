import fs from "fs";
import path from "path";
import { getGodspotConfig, type GodspotStorageType } from "./godspotConfig.js";
import { logger } from "./logger.js";

export type StoreObjectResult = {
  success: boolean;
  storageType: GodspotStorageType;
  key?: string;
  url?: string;
  size?: number;
  error?: string;
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function storeLocalObject(sourcePath: string, key: string): Promise<StoreObjectResult> {
  const config = getGodspotConfig();
  ensureDir(config.localDir);
  const targetPath = path.join(config.localDir, key);
  fs.copyFileSync(sourcePath, targetPath);
  const stat = fs.statSync(targetPath);
  return {
    success: true,
    storageType: "local",
    key,
    url: `/godspot-files/${encodeURIComponent(key)}`,
    size: stat.size,
  };
}

async function storeCloudflareObject(sourcePath: string, key: string, contentType: string): Promise<StoreObjectResult> {
  const config = getGodspotConfig();
  if (!config.cfUploadUrl || !config.cfAuthToken) {
    return { success: false, storageType: "cloudflare", error: "神人点位云存储未配置，请设置 GODSPOT_CF_UPLOAD_URL 和 GODSPOT_CF_AUTH_TOKEN" };
  }

  const baseUrl = config.cfUploadUrl.replace(/\/+$/, "");
  const uploadUrl = `${baseUrl}/${encodeURIComponent(key)}`;
  const buffer = fs.readFileSync(sourcePath);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: config.cfAuthToken,
      "Content-Type": contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { success: false, storageType: "cloudflare", error: `上传至云存储失败 (${res.status}): ${text.slice(0, 200)}` };
  }

  return {
    success: true,
    storageType: "cloudflare",
    key,
    url: config.publicBaseUrl ? `${config.publicBaseUrl}/${encodeURIComponent(key)}` : uploadUrl,
    size: buffer.length,
  };
}

export async function storeObject(sourcePath: string, key: string, contentType: string): Promise<StoreObjectResult> {
  const config = getGodspotConfig();
  try {
    if (config.storageType === "cloudflare") {
      return await storeCloudflareObject(sourcePath, key, contentType);
    }
    return await storeLocalObject(sourcePath, key);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error("神人点位文件存储失败", { error: message, key, storageType: config.storageType });
    return { success: false, storageType: config.storageType, error: message };
  }
}

export async function deleteObject(storageType: GodspotStorageType, key: string): Promise<boolean> {
  const config = getGodspotConfig();
  try {
    if (storageType === "cloudflare") {
      if (!config.cfUploadUrl || !config.cfAuthToken) return false;
      const baseUrl = config.cfUploadUrl.replace(/\/+$/, "");
      const res = await fetch(`${baseUrl}/${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: { Authorization: config.cfAuthToken },
      });
      return res.ok || res.status === 404;
    }

    const filePath = path.join(config.localDir, key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  } catch (e) {
    logger.error("神人点位文件删除失败", { error: e instanceof Error ? e.message : String(e), key, storageType });
    return false;
  }
}
