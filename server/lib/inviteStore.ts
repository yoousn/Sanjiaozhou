import fs from "fs";
import path from "path";
import crypto from "crypto";
import { writeJsonAtomic } from "./atomicJson.js";

const INVITES_FILE = path.join(process.cwd(), "runtime", "invite_codes.json");

export type InviteCode = {
  code: string;
  createdAt: string;
  createdBy: string;
  note?: string;
  usedBy?: string;
  usedAt?: string;
};

function ensureDir() {
  const dir = path.dirname(INVITES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function readInvites(): InviteCode[] {
  if (!fs.existsSync(INVITES_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(INVITES_FILE, "utf-8") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInvites(list: InviteCode[]) {
  ensureDir();
  writeJsonAtomic(INVITES_FILE, list);
}

function generateCode(): string {
  // 16 位字母+数字，避开易混淆字符 (0/O/1/I/l)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i === 3 || i === 7 || i === 11) out += "-";
  }
  return out;
}

export function createInvite(adminUsername: string, note?: string): InviteCode {
  const list = readInvites();
  let code = generateCode();
  // 极小概率碰撞重试
  while (list.some((i) => i.code === code)) {
    code = generateCode();
  }
  const invite: InviteCode = {
    code,
    createdAt: new Date().toISOString(),
    createdBy: adminUsername,
    note: note?.trim() ? note.trim().slice(0, 80) : undefined,
  };
  list.unshift(invite);
  writeInvites(list);
  return invite;
}

export function listInvites(): InviteCode[] {
  return readInvites();
}

export function consumeInvite(code: string, username: string): boolean {
  const trimmed = String(code || "").trim().toUpperCase();
  if (!trimmed) return false;
  const list = readInvites();
  const target = list.find((i) => i.code.toUpperCase() === trimmed && !i.usedBy);
  if (!target) return false;
  target.usedBy = username;
  target.usedAt = new Date().toISOString();
  writeInvites(list);
  return true;
}

export function deleteInvite(code: string): boolean {
  const list = readInvites();
  const idx = list.findIndex((i) => i.code === code);
  if (idx < 0) return false;
  // 已用过的也允许删除（清理历史）
  list.splice(idx, 1);
  writeInvites(list);
  return true;
}
