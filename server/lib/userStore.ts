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
};

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

export async function createUser(username: string, password: string): Promise<User> {
  const users = readUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("用户名已存在");
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser: User = {
    id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
    role: "user",
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
