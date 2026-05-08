import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { writeJsonAtomic } from "./atomicJson.js";
import { GODSPOT_MAPS, type GodspotStorageType } from "./godspotConfig.js";
import { deleteObject } from "./godspotStorage.js";

const GODSPOT_DIR = path.join(process.cwd(), "runtime", "godspot");
const GODSPOT_META_FILE = path.join(GODSPOT_DIR, "metadata.json");

export type GodspotSourceType = "upload" | "bilibili";

export type GodspotVideo = {
  id: string;
  displayName: string;
  mapName: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  videoKey: string;
  videoUrl: string;
  storageType: GodspotStorageType;
  sourceType: GodspotSourceType;
  sourceUrl?: string;
  bvid?: string;
  coverUrl?: string;
  uploader: string;
  createdAt: string;
};

function ensureDir() {
  if (!fs.existsSync(GODSPOT_DIR)) fs.mkdirSync(GODSPOT_DIR, { recursive: true });
}

function normalizeMapName(value: string) {
  return (GODSPOT_MAPS as readonly string[]).includes(value) ? value : GODSPOT_MAPS[0];
}

function normalizeVideo(raw: Partial<GodspotVideo>): GodspotVideo {
  const sourceType = raw.sourceType === "bilibili" ? "bilibili" as const : "upload" as const;
  return {
    id: String(raw.id || ""),
    displayName: String(raw.displayName || raw.originalFilename || "未命名视频").trim().slice(0, 80),
    mapName: normalizeMapName(String(raw.mapName || GODSPOT_MAPS[0])),
    originalFilename: String(raw.originalFilename || "").trim().slice(0, 160),
    mimeType: sourceType === "bilibili" ? "text/html" : String(raw.mimeType || "video/mp4"),
    size: Math.max(0, Number(raw.size) || 0),
    videoKey: String(raw.videoKey || raw.bvid || ""),
    videoUrl: String(raw.videoUrl || ""),
    storageType: sourceType === "bilibili" ? "external" as const : (raw.storageType === "cloudflare" ? "cloudflare" as const : "local" as const),
    sourceType,
    sourceUrl: raw.sourceUrl ? String(raw.sourceUrl).trim().slice(0, 500) : undefined,
    bvid: sourceType === "bilibili" ? String(raw.bvid || "").trim() : undefined,
    coverUrl: raw.coverUrl ? String(raw.coverUrl).trim().slice(0, 1000) : undefined,
    uploader: String(raw.uploader || "匿名").trim().slice(0, 50),
    createdAt: String(raw.createdAt || new Date().toISOString()),
  };
}

export function readGodspotVideos(): GodspotVideo[] {
  ensureDir();
  if (!fs.existsSync(GODSPOT_META_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(GODSPOT_META_FILE, "utf-8") || "[]");
    return Array.isArray(parsed)
      ? parsed.map(normalizeVideo).filter((item) => item.id && (item.sourceType === "bilibili" ? !!item.bvid : !!(item.videoUrl && item.videoKey)))
      : [];
  } catch {
    return [];
  }
}

export function writeGodspotVideos(videos: GodspotVideo[]) {
  ensureDir();
  writeJsonAtomic(GODSPOT_META_FILE, videos.map(normalizeVideo));
}

export function createGodspotVideo(data: Omit<GodspotVideo, "id" | "createdAt">): GodspotVideo {
  const videos = readGodspotVideos();
  const video = normalizeVideo({
    id: `gsv_${Date.now()}_${randomUUID().slice(0, 8)}`,
    ...data,
    createdAt: new Date().toISOString(),
  });
  videos.unshift(video);
  writeGodspotVideos(videos);
  return video;
}

export function queryGodspotVideos(mapName?: string): GodspotVideo[] {
  const videos = readGodspotVideos().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (!mapName || mapName === "全部") return videos;
  return videos.filter((video) => video.mapName === mapName);
}

export function getGodspotVideoById(id: string): GodspotVideo | undefined {
  return readGodspotVideos().find((video) => video.id === id);
}

export async function deleteGodspotVideo(id: string): Promise<GodspotVideo | null> {
  const videos = readGodspotVideos();
  const video = videos.find((item) => item.id === id);
  if (!video) return null;

  if (video.sourceType !== "bilibili") {
    await deleteObject(video.storageType, video.videoKey);
  }
  writeGodspotVideos(videos.filter((item) => item.id !== id));
  return video;
}

export function buildGodspotObjectKey(originalFilename: string) {
  const ext = path.extname(originalFilename || "").toLowerCase() || ".mp4";
  return `${Date.now()}_${randomUUID()}${ext}`;
}

export { GODSPOT_MAPS };
