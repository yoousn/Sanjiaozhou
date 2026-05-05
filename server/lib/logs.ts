import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { writeJsonAtomic } from "./atomicJson.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AUTO_LOGS_FILE = path.join(__dirname, "../../scripts", "auto_logs.json");
export const DAILY_PWD_LOGS_FILE = path.join(__dirname, "../../scripts", "daily_pwd_logs.json");

export type AutoLog = {
  time: string;
  message: string;
  success: boolean;
};

export function getBeijingTimeString() {
  return new Date().toLocaleString("sv", { timeZone: "Asia/Shanghai" }).slice(0, 19);
}

export function readLogs(filePath: string): AutoLog[] {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8") || "[]");
  } catch {
    return [];
  }
}

export function addLog(filePath: string, message: string, success: boolean) {
  const logs = readLogs(filePath);
  logs.unshift({ time: getBeijingTimeString(), message, success });
  if (logs.length > 100) logs.length = 100;
  writeJsonAtomic(filePath, logs);
}

export function readAutoLogs(): AutoLog[] {
  return readLogs(AUTO_LOGS_FILE);
}

export function addAutoLog(message: string, success: boolean) {
  addLog(AUTO_LOGS_FILE, message, success);
}

export function readDailyPwdLogs(): AutoLog[] {
  return readLogs(DAILY_PWD_LOGS_FILE);
}

export function addDailyPwdLog(message: string, success: boolean) {
  addLog(DAILY_PWD_LOGS_FILE, message, success);
}

export function clearLogs(filePath: string, days?: number): number {
  if (!fs.existsSync(filePath)) return 0;
  try {
    const logs = readLogs(filePath);
    if (days == null) {
      writeJsonAtomic(filePath, []);
      return logs.length;
    }
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    const remaining = logs.filter((log) => {
      const d = new Date(String(log.time).replace(/-/g, "/"));
      return d.getTime() > cutoff;
    });
    const removed = logs.length - remaining.length;
    writeJsonAtomic(filePath, remaining);
    return removed;
  } catch {
    return 0;
  }
}

export function clearAutoLogs(days?: number): number {
  return clearLogs(AUTO_LOGS_FILE, days);
}

export function clearDailyPwdLogs(days?: number): number {
  return clearLogs(DAILY_PWD_LOGS_FILE, days);
}