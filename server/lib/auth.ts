import { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";

export const SESSION_SECRET = process.env.SESSION_SECRET || (() => {
  const val = Math.random().toString(36).slice(2) + Date.now().toString(36);
  logger.warn("[AUTH] SESSION_SECRET not set. Sessions will not persist across restarts.");
  return val;
})();

/**
 * 判断客户端是否通过 HTTPS 访问。
 * Cloudflare 等 CDN 会设置 x-forwarded-proto 头，
 * 即使容器内部是 HTTP，客户端实际是 HTTPS 时也应设置 Secure cookie。
 */
function isSecureRequest(req: Request): boolean {
  // 直接 HTTPS
  if (req.secure) return true;
  // 反向代理标记
  const proto = req.headers["x-forwarded-proto"];
  if (proto === "https" || proto === "https,http") return true;
  return false;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = req.signedCookies?.user;
  if (!user || !user.id) {
    return res.status(401).json({ error: "未登录，请先登录" });
  }
  (req as any).authUser = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.signedCookies?.user;
  if (!user || !user.id) {
    return res.status(401).json({ error: "未登录，请先登录" });
  }
  if (user.role !== "admin") {
    return res.status(403).json({ error: "权限不足，需要管理员权限" });
  }
  (req as any).authUser = user;
  next();
}

export function setAuthCookie(res: Response, user: { id: string; username: string; role: string }, req?: Request) {
  // 客户端是 HTTPS 时设置 Secure 标志，否则浏览器会拒绝
  const secure = req ? isSecureRequest(req) : process.env.NODE_ENV === "production";
  res.cookie("user", user, {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 180,
    secure,
  });
}

export function clearAuthCookie(res: Response, req?: Request) {
  const secure = req ? isSecureRequest(req) : process.env.NODE_ENV === "production";
  res.clearCookie("user", { signed: true, httpOnly: true, sameSite: "lax", secure });
}
