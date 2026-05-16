import fs from "fs";
import path from "path";
import type { Request, Response, NextFunction } from "express";
import { writeJsonAtomic } from "./atomicJson.js";
import { logger } from "./logger.js";
import { resolveGeo, presetGeo } from "./ipGeo.js";

export type AccessLogEntry = {
  time: string;       // ISO
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  path: string;
  method: string;
  referer?: string;
  ua?: string;
  username?: string;  // 已登录用户名（如有）
};

const ACCESS_LOG_FILE = path.join(process.cwd(), "runtime", "access_log.json");
const MAX_ENTRIES = 5000;
const FLUSH_INTERVAL_MS = 60 * 1000;

let buffer: AccessLogEntry[] = [];
let dirty = false;
let loaded = false;

function ensureDir() {
  const dir = path.dirname(ACCESS_LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadIfNeeded() {
  if (loaded) return;
  loaded = true;
  if (!fs.existsSync(ACCESS_LOG_FILE)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(ACCESS_LOG_FILE, "utf-8") || "[]");
    if (Array.isArray(raw)) buffer = raw.slice(-MAX_ENTRIES);
  } catch (e) {
    logger.warn("Failed to load access_log.json", { error: e instanceof Error ? e.message : String(e) });
  }
}

function flush() {
  if (!dirty) return;
  try {
    ensureDir();
    writeJsonAtomic(ACCESS_LOG_FILE, buffer.slice(-MAX_ENTRIES));
    dirty = false;
  } catch (e) {
    logger.warn("Failed to flush access_log.json", { error: e instanceof Error ? e.message : String(e) });
  }
}

setInterval(flush, FLUSH_INTERVAL_MS).unref?.();
process.on("beforeExit", flush);

function pickHeader(req: Request, name: string): string | undefined {
  const v = req.headers[name];
  if (Array.isArray(v)) return v[0];
  return typeof v === "string" ? v : undefined;
}

function shortenPath(p: string): string {
  if (!p) return "/";
  // 限制长度，避免日志被超长 URL 撑爆
  return p.length > 200 ? p.slice(0, 200) + "…" : p;
}

function shortenUa(ua?: string): string | undefined {
  if (!ua) return undefined;
  return ua.length > 250 ? ua.slice(0, 250) : ua;
}

/**
 * 记录一次访问。仅用于页面级访问，不要记录 API。
 */
export function recordAccess(req: Request) {
  loadIfNeeded();
  const cfHint = presetGeo({
    country: pickHeader(req, "cf-ipcountry"),
    region: pickHeader(req, "cf-region"),
    city: pickHeader(req, "cf-ipcity"),
  });
  const referer = pickHeader(req, "referer");
  const ua = pickHeader(req, "user-agent");
  const signed = (req as any).signedCookies?.user;
  const ip = req.ip || req.socket?.remoteAddress || "unknown";

  const entry: AccessLogEntry = {
    time: new Date().toISOString(),
    ip,
    country: cfHint.country,
    region: cfHint.region,
    city: cfHint.city,
    path: shortenPath(req.originalUrl || req.url),
    method: req.method,
    referer: referer ? shortenPath(referer) : undefined,
    ua: shortenUa(ua),
    username: signed?.username,
  };

  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) {
    buffer.splice(0, buffer.length - MAX_ENTRIES);
  }
  dirty = true;

  // 异步补齐地区信息：CF 头没有时查 ip-api.com
  if (!entry.country) {
    void resolveGeo(ip, cfHint).then((geo) => {
      if (!geo.country && !geo.region && !geo.city) return;
      entry.country = entry.country || geo.country;
      entry.region = entry.region || geo.region;
      entry.city = entry.city || geo.city;
      dirty = true;
    }).catch(() => { /* 静默 */ });
  }
}

/**
 * 中间件：仅在请求**不是** /api/* 也不是静态资源时记录访问。
 */
export function accessLogMiddleware(req: Request, _res: Response, next: NextFunction) {
  const url = req.path || "";
  const isApi = url.startsWith("/api/");
  const isAsset = /\.(js|css|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|br|gz)(\?|$)/i.test(url);
  const isUploads = url.startsWith("/uploads/") || url.startsWith("/godspot-files/");
  if (req.method === "GET" && !isApi && !isAsset && !isUploads) {
    try {
      recordAccess(req);
    } catch (e) {
      // 日志失败不影响主流程
    }
  }
  next();
}

export function listAccessLogs(limit?: number): AccessLogEntry[] {
  loadIfNeeded();
  const n = Math.max(1, Math.min(MAX_ENTRIES, Number(limit) || 500));
  // 倒序：最新在前
  return buffer.slice(-n).reverse();
}

export function getAccessLogStats() {
  loadIfNeeded();
  const total = buffer.length;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const last24h = buffer.filter((e) => now - new Date(e.time).getTime() < dayMs).length;
  const last1h = buffer.filter((e) => now - new Date(e.time).getTime() < 60 * 60 * 1000).length;

  const uniqueIp24h = new Set(
    buffer.filter((e) => now - new Date(e.time).getTime() < dayMs).map((e) => e.ip)
  ).size;

  return { total, last24h, last1h, uniqueIp24h };
}

export function clearAccessLogs(): number {
  loadIfNeeded();
  const removed = buffer.length;
  buffer = [];
  dirty = true;
  flush();
  return removed;
}
