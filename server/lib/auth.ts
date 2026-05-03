import { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";

export const SESSION_SECRET = process.env.SESSION_SECRET || (() => {
  const val = Math.random().toString(36).slice(2) + Date.now().toString(36);
  logger.warn("[AUTH] SESSION_SECRET not set. Sessions will not persist across restarts.");
  return val;
})();

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

export function setAuthCookie(res: Response, user: { id: string; username: string; role: string }) {
  // 仅在真正的 HTTPS 环境下启用 secure，避免 HTTP 部署时 cookie 无法设置
  const isSecure = process.env.NODE_ENV === "production" && process.env.HTTPS === "true";
  res.cookie("user", user, {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 180,
    secure: isSecure,
  });
}

export function clearAuthCookie(res: Response) {
  const isSecure = process.env.NODE_ENV === "production" && process.env.HTTPS === "true";
  res.clearCookie("user", { signed: true, httpOnly: true, sameSite: "lax", secure: isSecure });
}
