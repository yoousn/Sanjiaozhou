import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
  fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), "utf-8");
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