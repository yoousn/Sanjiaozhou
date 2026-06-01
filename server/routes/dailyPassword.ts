import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";
import { readDailyPwdLogs, addDailyPwdLog, clearDailyPwdLogs } from "../lib/logs.js";
import { writeJsonAtomic } from "../lib/atomicJson.js";
import { requireAdmin } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DAILY_PWD_SCRIPT = path.join(__dirname, "..", "..", "爬取每日密码.py");
const DAILY_PWD_FILE = path.join(__dirname, "..", "..", "src", "daily_pwd.json");

const router = Router();

router.get("/logs", requireAdmin, (_req, res) => {
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

router.post("/refresh", requireAdmin, async (req, res) => {
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
    writeJsonAtomic(DAILY_PWD_FILE, payload);
    if (isManual) {
      addDailyPwdLog(`手动刷新成功：已获取 ${beijingDate} 的每日密码`, true);
    }
    res.json({ success: true, data: payload });
  } catch (e) {
    const message = e instanceof Error ? e.message : "获取密码失败，请检查脚本";
    addDailyPwdLog(`${sourceLabel}失败：${message}`, false);
    logger.error("API PASSWORD REFRESH Error", { error: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ error: message });
  }
});

router.post("/logs/clear", requireAdmin, (req, res) => {
  try {
    const days = req.body?.days;
    const daysParam = days === "all" ? undefined : Number(days);
    const removed = clearDailyPwdLogs(daysParam);
    const label = days === "all" || days == null ? "全部" : `${daysParam}天前`;
    addDailyPwdLog(`已清空${label}日志，共删除 ${removed} 条`, true);
    res.json({ success: true, removed });
  } catch (e) {
    logger.error("API CLEAR DAILY PWD LOGS Error", { error: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ error: "清空日志失败" });
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
            writeJsonAtomic(DAILY_PWD_FILE, payload);
            lastSuccessfulPwdDate = currentDay;
            addDailyPwdLog(`自动抓取成功：已获取 ${currentDay} 的每日密码`, true);
            logger.info(`成功获取 ${currentDay} 的每日密码`);
          } else {
            addDailyPwdLog(`自动抓取未命中：${currentDay} 暂无有效密码`, false);
          }
        } else {
          addDailyPwdLog(`自动抓取失败：${parsed.error}`, false);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        addDailyPwdLog(`自动抓取异常：${message}`, false);
        logger.error("自动获取每日密码失败", { error: e instanceof Error ? e.message : String(e) });
      }
    }
  }, 1000 * 60 * 10);
}

export default router;
