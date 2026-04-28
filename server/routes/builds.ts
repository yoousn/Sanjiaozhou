import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GunGroup } from "../../src/types.js";
import { ensureGroupShape } from "../lib/shape.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "..", "..", "src", "data.json");

export function readBuilds(): GunGroup[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const parsed = JSON.parse(raw || "[]");
  return Array.isArray(parsed) ? parsed.map(ensureGroupShape) : [];
}

export function writeBuilds(data: GunGroup[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

const router = Router();

router.get("/", (req, res) => {
  try {
    res.json(readBuilds());
  } catch (e) {
    console.error("API GET Error:", e);
    res.status(500).json({ error: "Failed to read data" });
  }
});

router.post("/", (req, res) => {
  try {
    const data = Array.isArray(req.body) ? req.body.map(ensureGroupShape) : [];
    writeBuilds(data);
    res.json({ success: true });
  } catch (e) {
    console.error("API POST Error:", e);
    res.status(500).json({ error: "Failed to write data" });
  }
});

export default router;
