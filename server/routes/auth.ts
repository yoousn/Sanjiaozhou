import { Router } from "express";
import {
  createUser,
  findUser,
  verifyPassword,
  readUsers,
  recordLogin,
  listPublicUsers,
  deleteUserById,
  setUserRole,
} from "../lib/userStore.js";
import { setAuthCookie, clearAuthCookie, requireAdmin } from "../lib/auth.js";
import { rateLimit } from "../lib/rateLimiter.js";
import { createInvite, listInvites, consumeInvite, deleteInvite } from "../lib/inviteStore.js";
import { getClientIp } from "../lib/clientIp.js";

const router = Router();

router.post("/register", rateLimit(10, 15 * 60 * 1000, "注册请求过于频繁，请 15 分钟后再试"), async (req, res) => {
  try {
    const { username, password, inviteCode } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "用户名和密码不能为空" });
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ success: false, error: "用户名长度需在 2-20 位之间" });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, error: "密码至少需要 4 位" });
    }

    // 首个用户引导：没有任何账号时允许直接注册（自动成为管理员）
    const existingUsers = readUsers();
    const isFirstUser = existingUsers.length === 0;

    if (!isFirstUser) {
      const code = String(inviteCode || "").trim();
      if (!code) {
        return res.status(400).json({ success: false, error: "请输入邀请码" });
      }
      const ok = consumeInvite(code, username);
      if (!ok) {
        return res.status(400).json({ success: false, error: "邀请码无效或已被使用" });
      }
    }

    const ip = getClientIp(req);
    const user = await createUser(username, password, { ip });
    // 注册即登录，记录一次登录信息
    recordLogin(user.id, { ip, userAgent: req.headers["user-agent"] });
    setAuthCookie(res, { id: user.id, username: user.username, role: user.role || "user" }, req);
    res.json({ success: true, data: { id: user.id, username: user.username, role: user.role || "user" } });
  } catch (e) {
    res.status(400).json({ success: false, error: e instanceof Error ? e.message : "注册失败" });
  }
});

router.post("/login", rateLimit(5, 15 * 60 * 1000, "登录请求过于频繁，请 15 分钟后再试"), async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "用户名和密码不能为空" });
    }

    const user = await findUser(username);
    if (!user) {
      return res.status(401).json({ success: false, error: "用户名或密码错误" });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: "用户名或密码错误" });
    }

    const role = user.role || "user";
    recordLogin(user.id, { ip: getClientIp(req), userAgent: req.headers["user-agent"] });
    setAuthCookie(res, { id: user.id, username: user.username, role }, req);
    res.json({ success: true, data: { id: user.id, username: user.username, role } });
  } catch (e) {
    res.status(500).json({ success: false, error: "登录异常" });
  }
});

router.get("/me", (req, res) => {
  const user = req.signedCookies?.user;
  if (!user || !user.id) {
    return res.status(401).json({ success: false, error: "未登录" });
  }
  res.json({ success: true, data: user });
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res, req);
  res.json({ success: true });
});

// ============ 邀请码管理（仅管理员） ============

router.get("/invites", requireAdmin, (_req, res) => {
  res.json({ success: true, data: listInvites() });
});

router.post("/invites", requireAdmin, (req, res) => {
  try {
    const user = (req as any).authUser;
    const note = typeof req.body?.note === "string" ? req.body.note : undefined;
    const invite = createInvite(user.username, note);
    res.json({ success: true, data: invite });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : "生成邀请码失败" });
  }
});

router.delete("/invites/:code", requireAdmin, (req, res) => {
  const code = req.params.code;
  const ok = deleteInvite(code);
  if (!ok) {
    return res.status(404).json({ success: false, error: "邀请码不存在" });
  }
  res.json({ success: true });
});

// ============ 用户管理（仅管理员） ============

router.get("/users", requireAdmin, (_req, res) => {
  res.json({ success: true, data: listPublicUsers() });
});

router.delete("/users/:id", requireAdmin, (req, res) => {
  const me = (req as any).authUser;
  const targetId = req.params.id;
  if (targetId === me.id) {
    return res.status(400).json({ success: false, error: "不能删除自己" });
  }
  const ok = deleteUserById(targetId);
  if (!ok) {
    return res.status(404).json({ success: false, error: "用户不存在" });
  }
  res.json({ success: true });
});

router.post("/users/:id/role", requireAdmin, (req, res) => {
  const me = (req as any).authUser;
  const targetId = req.params.id;
  const role = req.body?.role === "admin" ? "admin" : "user";
  if (targetId === me.id && role !== "admin") {
    return res.status(400).json({ success: false, error: "不能取消自己的管理员权限" });
  }
  const ok = setUserRole(targetId, role);
  if (!ok) {
    return res.status(404).json({ success: false, error: "用户不存在" });
  }
  res.json({ success: true });
});

export default router;
