import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";
import { readDailyPwdLogs, addDailyPwdLog } from "../lib/logs.js";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DAILY_PWD_SCRIPT = path.join(__dirname, "..", "..", "爬取每日密码.py");
const DAILY_PWD_FILE = path.join(__dirname, "..", "..", "src", "daily_pwd.json");

const router = Router();

router.get("/logs", (_req, res) => {
  res.json({ logs: readDailyPwdLogs() });
});

router.get("/", (req, res) => {
  if (fs.existsSync(DAILY_PWD_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DAILY_PWD_FILE, "utf-8"));
      res.json(data);
    } catch (e) {
      addDailyPwdLog("读取缓存失败：密码解析失败", false);
      res.status(500).json({ error: "密码解析失败" });
    }
  } else {
    addDailyPwdLog("读取缓存失败：今日密码暂未缓存", false);
    res.status(404).json({ error: "今日密码暂未缓存" });
  }
});

router.post("/refresh", async (req, res) => {
  const isManual = Boolean(req.body?.manual);
  const sourceLabel = isManual ? "手动刷新" : "自动刷新";
  try {
    const { stdout } = await execFileAsync("python", ["-u", DAILY_PWD_SCRIPT], {
      cwd: path.join(__dirname, "..", ".."),
      encoding: "utf8",
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    const parsed = JSON.parse(stdout.trim());
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    const beijingDate = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const payload = { date: beijingDate, data: parsed };
    fs.writeFileSync(DAILY_PWD_FILE, JSON.stringify(payload, null, 2), "utf-8");
    if (isManual) {
      addDailyPwdLog(`手动刷新成功：已获取 ${beijingDate} 的每日密码`, true);
    }
    res.json({ success: true, data: payload });
  } catch (e) {
    const message = e instanceof Error ? e.message : "获取密码失败，请检查脚本";
    addDailyPwdLog(`${sourceLabel}失败：${message}`, false);
    console.error("API PASSWORD REFRESH Error:", e);
    res.status(500).json({ error: message });
  }
});

export function startDailyPwdJob() {
  let lastSuccessfulPwdDate = "";
  if (fs.existsSync(DAILY_PWD_FILE)) {
    try {
      const cache = JSON.parse(fs.readFileSync(DAILY_PWD_FILE, "utf-8"));
      if (cache.date) lastSuccessfulPwdDate = cache.date;
    } catch (e) {
      addDailyPwdLog("启动检查失败：历史缓存解析失败", false);
    }
  }

  setInterval(async () => {
    const currentDay = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
    if (currentDay !== lastSuccessfulPwdDate) {
      try {
        const { stdout } = await execFileAsync("python", ["-u", DAILY_PWD_SCRIPT], {
          cwd: path.join(__dirname, "..", ".."),
          encoding: "utf8",
          env: { ...process.env, PYTHONIOENCODING: "utf-8" },
        });
        const parsed = JSON.parse(stdout.trim());
        if (!parsed.error) {
          const hasData = Object.values(parsed).some(v => v !== "未发现数据");
          if (hasData) {
            const payload = { date: currentDay, data: parsed };
            fs.writeFileSync(DAILY_PWD_FILE, JSON.stringify(payload, null, 2), "utf-8");
            lastSuccessfulPwdDate = currentDay;
            addDailyPwdLog(`自动抓取成功：已获取 ${currentDay} 的每日密码`, true);
            console.log(`[每日密码] 成功获取 ${currentDay} 的密码`);
          } else {
            addDailyPwdLog(`自动抓取未命中：${currentDay} 暂无有效密码`, false);
          }
        } else {
          addDailyPwdLog(`自动抓取失败：${parsed.error}`, false);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        addDailyPwdLog(`自动抓取异常：${message}`, false);
        console.error("[每日密码] 自动获取失败:", e);
      }
    }
  }, 1000 * 60 * 10);
}

export default router;
