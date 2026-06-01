import type { Request, Response, NextFunction } from "express";
import { getClientIp } from "./clientIp.js";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// 每 60 秒清理一次过期的限流记录，避免内存泄漏
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60 * 1000).unref();

function getKey(req: Request, suffix: string): string {
  const ip = getClientIp(req);
  return `${ip}:${suffix}`;
}

function isLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  if (entry.count > max) {
    return true;
  }
  return false;
}

export function rateLimit(max: number, windowMs: number, message = "请求过于频繁，请稍后重试") {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = getKey(req, req.path);
    if (isLimited(key, max, windowMs)) {
      return res.status(429).json({ error: message });
    }
    next();
  };
}
