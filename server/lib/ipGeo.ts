import { logger } from "./logger.js";

export type GeoInfo = {
  country?: string;
  region?: string;
  city?: string;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const NEGATIVE_TTL_MS = 30 * 60 * 1000;   // 30min（失败也缓存，避免反复重试拖慢首页）
const cache = new Map<string, { value: GeoInfo; expireAt: number }>();
const inflight = new Map<string, Promise<GeoInfo>>();

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const v = ip.replace(/^::ffff:/, "");
  if (v === "::1" || v === "127.0.0.1" || v === "localhost") return true;
  if (v === "0.0.0.0" || v === "unknown") return true;
  // IPv4 私网
  const parts = v.split(".").map(Number);
  if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  // IPv6 私网（简化判断 fc00::/7、fe80::/10、::）
  if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb")) return true;
  return false;
}

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "XX") return undefined;
  return trimmed.slice(0, 60);
}

async function queryIpApi(ip: string): Promise<GeoInfo> {
  // ip-api.com 免费接口：HTTP，每分钟 45 次，无需 key
  // 国内大多数 IP 也能识别（数据来自 MaxMind + 自有库）
  const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,query&lang=zh-CN`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return {};
    const data = await res.json() as any;
    if (data?.status !== "success") return {};
    return {
      country: clean(data.country),
      region: clean(data.regionName),
      city: clean(data.city),
    };
  } catch (e) {
    logger.warn("ip-api.com query failed", { ip, error: e instanceof Error ? e.message : String(e) });
    return {};
  }
}

/**
 * 优先返回 Cloudflare 头中已有的地区；
 * 若没有（如直连 IP / 本地反代），异步查询 ip-api.com。
 * 同步路径不会发出网络请求，调用方需要 await。
 */
export async function resolveGeo(ip: string, hint?: GeoInfo): Promise<GeoInfo> {
  // 已有 Cloudflare 提供的国家就直接用
  if (hint?.country) return hint;
  if (!ip || isPrivateIp(ip)) return { country: "本地" };

  const cached = cache.get(ip);
  if (cached && cached.expireAt > Date.now()) return cached.value;

  const existing = inflight.get(ip);
  if (existing) return existing;

  const task = (async () => {
    const result = await queryIpApi(ip);
    const ttl = result.country ? CACHE_TTL_MS : NEGATIVE_TTL_MS;
    cache.set(ip, { value: result, expireAt: Date.now() + ttl });
    inflight.delete(ip);
    return result;
  })();
  inflight.set(ip, task);
  return task;
}

export function presetGeo(hint: GeoInfo | undefined): GeoInfo {
  if (!hint) return {};
  return {
    country: clean(hint.country),
    region: clean(hint.region),
    city: clean(hint.city),
  };
}
