import type { Request } from "express";

function pickHeader(req: Request, name: string): string | undefined {
  const v = req.headers[name];
  if (Array.isArray(v)) return v[0];
  if (typeof v === "string") return v.trim() || undefined;
  return undefined;
}

function isPrivateOrLocal(ip: string): boolean {
  if (!ip) return true;
  const v = ip.replace(/^::ffff:/, "");
  if (v === "::1" || v === "127.0.0.1" || v === "0.0.0.0" || v === "localhost" || v === "unknown") return true;
  const parts = v.split(".").map(Number);
  if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb")) return true;
  return false;
}

/**
 * 解析客户端真实 IP，多级回退：
 * 1. Cloudflare 的 cf-connecting-ip（最可靠，CF 边缘节点必发）
 * 2. true-client-ip（CF Enterprise / 部分 CDN）
 * 3. x-real-ip（OpenResty / nginx 常见）
 * 4. x-forwarded-for 最左非私网 IP
 * 5. req.ip（Express 在 trust proxy 下解析的结果）
 * 6. socket.remoteAddress
 */
export function getClientIp(req: Request): string {
  const cf = pickHeader(req, "cf-connecting-ip");
  if (cf && !isPrivateOrLocal(cf)) return cf;

  const trueClient = pickHeader(req, "true-client-ip");
  if (trueClient && !isPrivateOrLocal(trueClient)) return trueClient;

  const realIp = pickHeader(req, "x-real-ip");
  if (realIp && !isPrivateOrLocal(realIp)) return realIp;

  const xff = pickHeader(req, "x-forwarded-for");
  if (xff) {
    const candidates = xff.split(",").map((s) => s.trim()).filter(Boolean);
    for (const c of candidates) {
      if (!isPrivateOrLocal(c)) return c;
    }
    if (candidates.length > 0) return candidates[0];
  }

  if (req.ip && !isPrivateOrLocal(req.ip)) return req.ip;
  return req.ip || req.socket?.remoteAddress || "unknown";
}
