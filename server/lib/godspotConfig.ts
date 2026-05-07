import path from "path";

export type GodspotStorageType = "local" | "cloudflare";

export const GODSPOT_MAPS = ["零号🚌", "长工戏骨", "巴克什", "航天基地", "抄袭监狱"] as const;

export const ALLOWED_GODSPOT_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/x-msvideo",
] as const;

export type GodspotConfig = {
  storageType: GodspotStorageType;
  localDir: string;
  tempDir: string;
  maxFileSize: number;
  cfUploadUrl: string;
  cfAuthToken: string;
  publicBaseUrl: string;
};

function normalizeStorageType(value?: string): GodspotStorageType {
  return value === "cloudflare" ? "cloudflare" : "local";
}

export function getGodspotConfig(): GodspotConfig {
  return {
    storageType: normalizeStorageType(process.env.GODSPOT_STORAGE),
    localDir: path.resolve(process.env.GODSPOT_LOCAL_DIR || path.join(process.cwd(), "runtime", "godspot", "videos")),
    tempDir: path.resolve(process.env.GODSPOT_TEMP_DIR || path.join(process.cwd(), "runtime", "godspot", "tmp")),
    maxFileSize: Math.max(1, Number(process.env.GODSPOT_MAX_FILE_MB || 500)) * 1024 * 1024,
    cfUploadUrl: String(process.env.GODSPOT_CF_UPLOAD_URL || "").trim(),
    cfAuthToken: String(process.env.GODSPOT_CF_AUTH_TOKEN || "").trim(),
    publicBaseUrl: String(process.env.GODSPOT_PUBLIC_URL || "").trim().replace(/\/+$/, ""),
  };
}
