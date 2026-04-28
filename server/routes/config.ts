import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runCollector } from "../lib/collector.js";
import { readCollectSettings, COLLECT_SETTINGS_FILE } from "../lib/collectSettings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

router.get("/cookie/status", (req, res) => {
  const cookiePath = path.join(__dirname, "..", "..", "scripts", "cookies.txt");
  if (fs.existsSync(cookiePath)) {
    const stats = fs.statSync(cookiePath);
    res.json({ exists: true, mtime: stats.mtime });
  } else {
    res.json({ exists: false });
  }
});

router.post("/cookie", async (req, res) => {
  try {
    const body = req.body || {};
    const content = body.content;
    if (!content) {
      return res.status(400).json({ error: "文件内容为空" });
    }
    fs.writeFileSync(path.join(__dirname, "..", "..", "scripts", "cookies.txt"), content, "utf-8");
    const parsed = await runCollector(["--mode", "check-cookie"]);
    res.json(parsed);
  } catch (e) {
    console.error("API COOKIE UPLOAD Error:", e);
    res.status(500).json({ success: false, message: e instanceof Error ? e.message : "测试失败" });
  }
});

router.get("/settings-file", (req, res) => {
  try {
    const settings = readCollectSettings();
    res.json(settings);
  } catch (e) {
    console.error("API GET settings-file Error:", e);
    res.status(500).json({ error: "Failed to read settings file" });
  }
});

router.get("/settings-file/status", (req, res) => {
  const settingsPath = COLLECT_SETTINGS_FILE;
  if (fs.existsSync(settingsPath)) {
    const stats = fs.statSync(settingsPath);
    res.json({ exists: true, mtime: stats.mtime });
  } else {
    res.json({ exists: false });
  }
});

export default router;
