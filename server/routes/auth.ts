import { Router } from "express";
import { createUser, findUser, verifyPassword } from "../lib/userStore.js";

const router = Router();

router.post("/register", async (req, res) => {
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
    res.json({ success: true, data: { id: user.id, username: user.username } });
  } catch (e) {
    res.status(400).json({ success: false, error: e instanceof Error ? e.message : "注册失败" });
  }
});

router.post("/login", async (req, res) => {
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

    res.json({ success: true, data: { id: user.id, username: user.username } });
  } catch (e) {
    res.status(500).json({ success: false, error: "登录异常" });
  }
});

export default router;
