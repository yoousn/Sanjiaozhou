import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { writeJsonAtomic } from "./atomicJson.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, "../../scripts", "users.json");

export type User = {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  role?: string; // "admin" | "user"
  registerIp?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginUa?: string;
  loginCount?: number;
};

// 不含敏感字段的对外用户类型
export type PublicUser = Omit<User, "passwordHash">;

export function readUsers(): User[] {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8") || "[]");
  } catch {
    return [];
  }
}

export function writeUsers(users: User[]) {
  writeJsonAtomic(USERS_FILE, users);
}

function toPublic(user: User): PublicUser {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}

export function listPublicUsers(): PublicUser[] {
  return readUsers()
    .map(toPublic)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function createUser(
  username: string,
  password: string,
  meta?: { ip?: string }
): Promise<User> {
  const users = readUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("用户名已存在");
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // 第一个注册的用户自动成为管理员
  const role = users.length === 0 ? "admin" : "user";

  const newUser: User = {
    id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
    role,
    registerIp: meta?.ip,
  };

  users.push(newUser);
  writeUsers(users);
  return newUser;
}

export async function findUser(username: string): Promise<User | undefined> {
  const users = readUsers();
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function recordLogin(userId: string, meta: { ip?: string; userAgent?: string }) {
  const users = readUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return;
  target.lastLoginAt = new Date().toISOString();
  target.lastLoginIp = meta.ip;
  target.lastLoginUa = meta.userAgent ? meta.userAgent.slice(0, 200) : undefined;
  target.loginCount = (target.loginCount || 0) + 1;
  writeUsers(users);
}

export function deleteUserById(userId: string): boolean {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return false;
  users.splice(idx, 1);
  writeUsers(users);
  return true;
}

export function setUserRole(userId: string, role: "admin" | "user"): boolean {
  const users = readUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return false;
  target.role = role;
  writeUsers(users);
  return true;
}
