import fs from "fs";
import path from "path";
import { writeJsonAtomic } from "./atomicJson.js";
import { logger } from "./logger.js";

export type GodspotStorageType = "local" | "cloudflare";

export type GodspotStorageSettings = {
  storageType: GodspotStorageType;
  cfUploadUrl: string;
  cfAuthToken: string;
  publicBaseUrl: string;
};

export type PublicGodspotStorageSettings = Omit<GodspotStorageSettings, "cfAuthToken"> & {
  hasCfAuthToken: boolean;
};

const SETTINGS_DIR = path.join(process.cwd(), "runtime", "godspot");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function normalizeStorageType(value: unknown): GodspotStorageType {
  return value === "cloudflare" ? "cloudflare" : "local";
}

function cleanUrl(value: unknown) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function readStoredSettings(): Partial<GodspotStorageSettings> {
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    if (!raw || typeof raw !== "object") return {};
    return {
      storageType: normalizeStorageType((raw as any).storageType),
      cfUploadUrl: cleanUrl((raw as any).cfUploadUrl),
      cfAuthToken: String((raw as any).cfAuthToken || "").trim(),
      publicBaseUrl: cleanUrl((raw as any).publicBaseUrl),
    };
  } catch (e) {
    logger.error("Read godspot storage settings failed", { error: e instanceof Error ? e.message : String(e) });
    return {};
  }
}

export function getGodspotStorageSettings(): GodspotStorageSettings {
  const stored = readStoredSettings();
  return {
    storageType: normalizeStorageType(stored.storageType || process.env.GODSPOT_STORAGE),
    cfUploadUrl: cleanUrl(stored.cfUploadUrl || process.env.GODSPOT_CF_UPLOAD_URL),
    cfAuthToken: String(stored.cfAuthToken || process.env.GODSPOT_CF_AUTH_TOKEN || "").trim(),
    publicBaseUrl: cleanUrl(stored.publicBaseUrl || process.env.GODSPOT_PUBLIC_URL),
  };
}

export function toPublicGodspotStorageSettings(settings = getGodspotStorageSettings()): PublicGodspotStorageSettings {
  return {
    storageType: settings.storageType,
    cfUploadUrl: settings.cfUploadUrl,
    publicBaseUrl: settings.publicBaseUrl,
    hasCfAuthToken: Boolean(settings.cfAuthToken),
  };
}

export function saveGodspotStorageSettings(input: Partial<GodspotStorageSettings> & { keepExistingToken?: boolean }): PublicGodspotStorageSettings {
  ensureDir(SETTINGS_DIR);
  const current = getGodspotStorageSettings();
  const next: GodspotStorageSettings = {
    storageType: normalizeStorageType(input.storageType),
    cfUploadUrl: cleanUrl(input.cfUploadUrl),
    cfAuthToken: input.keepExistingToken ? current.cfAuthToken : String(input.cfAuthToken || "").trim(),
    publicBaseUrl: cleanUrl(input.publicBaseUrl),
  };

  if (next.storageType === "cloudflare") {
    if (!next.cfUploadUrl) throw new Error("请填写 Cloudflare R2 上传地址");
    if (!next.cfAuthToken) throw new Error("请填写 Cloudflare R2 授权 Token");
    if (!next.publicBaseUrl) throw new Error("请填写 Cloudflare R2 公开访问地址");
  }

  writeJsonAtomic(SETTINGS_FILE, next);
  return toPublicGodspotStorageSettings(next);
}
