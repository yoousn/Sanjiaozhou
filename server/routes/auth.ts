import { Router } from "express";
import { createUser, findUser, verifyPassword } from "../lib/userStore.js";
import { setAuthCookie, clearAuthCookie } from "../lib/auth.js";
import { rateLimit } from "../lib/rateLimiter.js";

const router = Router();

router.post("/register", rateLimit(10, 15 * 60 * 1000, "注册请求过于频繁，请 15 分钟后再试"), async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "用户名和密码不能为空" });
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ success: false, error: "用户名长度需在 2-20 位之间" });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, error: "密码至少需要 4 位" });
    }

    const user = await createUser(username, password);
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

export default router;
