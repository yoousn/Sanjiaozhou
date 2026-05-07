import fs from "fs";
import path from "path";
import { createHash, createHmac } from "crypto";
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

type S3Credentials = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service: string;
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sha256Hex(data: Buffer | string) {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest("hex");
}

function normalizeAmzDate(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function encodeCanonicalPath(pathname: string) {
  return pathname.split("/").map(part => encodeURIComponent(decodeURIComponent(part))).join("/") || "/";
}

function parseS3Credentials(token: string): S3Credentials | null {
  const text = token.trim();
  if (!text) return null;

  if (text.startsWith("{")) {
    try {
      const raw = JSON.parse(text);
      const accessKeyId = String(raw.accessKeyId || raw.accessKey || raw.AWS_ACCESS_KEY_ID || "").trim();
      const secretAccessKey = String(raw.secretAccessKey || raw.secretKey || raw.AWS_SECRET_ACCESS_KEY || "").trim();
      if (!accessKeyId || !secretAccessKey) return null;
      return {
        accessKeyId,
        secretAccessKey,
        region: String(raw.region || "auto").trim() || "auto",
        service: String(raw.service || "s3").trim() || "s3",
      };
    } catch {
      return null;
    }
  }

  const parts = text.split(":");
  if (parts.length < 2 || /^Bearer\s+/i.test(text) || /^Basic\s+/i.test(text) || /^AWS4-HMAC-SHA256\s+/i.test(text)) return null;
  const [accessKeyId, secretAccessKey, region = "auto", service = "s3"] = parts.map(part => part.trim());
  if (!accessKeyId || !secretAccessKey) return null;
  return { accessKeyId, secretAccessKey, region: region || "auto", service: service || "s3" };
}

function buildS3SignedHeaders(method: "PUT" | "DELETE", url: string, bodyHash: string, contentType?: string): Record<string, string> {
  const config = getGodspotConfig();
  const credentials = parseS3Credentials(config.cfAuthToken);
  const target = new URL(url);
  const { amzDate, dateStamp } = normalizeAmzDate();

  if (!credentials) {
    return {
      Authorization: config.cfAuthToken,
      ...(contentType ? { "Content-Type": contentType } : {}),
      ...(method === "PUT" ? { "Cache-Control": "public, max-age=31536000, immutable" } : {}),
      "x-amz-content-sha256": bodyHash,
      "x-amz-date": amzDate,
      Date: new Date().toUTCString(),
    };
  }

  const baseHeaders: Record<string, string> = {
    host: target.host,
    "x-amz-content-sha256": bodyHash,
    "x-amz-date": amzDate,
  };
  if (contentType) baseHeaders["content-type"] = contentType;
  if (method === "PUT") baseHeaders["cache-control"] = "public, max-age=31536000, immutable";

  const sortedHeaderNames = Object.keys(baseHeaders).sort();
  const canonicalHeaders = sortedHeaderNames.map(name => `${name}:${baseHeaders[name].trim()}\n`).join("");
  const signedHeaders = sortedHeaderNames.join(";");
  const canonicalRequest = [
    method,
    encodeCanonicalPath(target.pathname),
    target.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${credentials.region}/${credentials.service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${credentials.secretAccessKey}`, dateStamp), credentials.region), credentials.service), "aws4_request");
  const signature = hmacHex(signingKey, stringToSign);

  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    ...(method === "PUT" ? { "Cache-Control": "public, max-age=31536000, immutable" } : {}),
    "x-amz-content-sha256": bodyHash,
    "x-amz-date": amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
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
  const bodyHash = sha256Hex(buffer);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: buildS3SignedHeaders("PUT", uploadUrl, bodyHash, contentType || "application/octet-stream"),
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
      const deleteUrl = `${baseUrl}/${encodeURIComponent(key)}`;
      const res = await fetch(deleteUrl, {
        method: "DELETE",
        headers: buildS3SignedHeaders("DELETE", deleteUrl, sha256Hex("")),
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
