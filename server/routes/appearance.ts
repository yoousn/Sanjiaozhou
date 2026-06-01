import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { logger } from "../lib/logger.js";
import { requireAdmin } from "../lib/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUNTIME_DIR = path.join(__dirname, "..", "..", "runtime");
const UPLOADS_DIR = path.join(RUNTIME_DIR, "uploads");
const APPEARANCE_FILE = path.join(RUNTIME_DIR, "appearance.json");

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureDir(UPLOADS_DIR);
      cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname) || ".png";
      cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(RUNTIME_DIR);
ensureDir(UPLOADS_DIR);

function readAppearance() {
  try {
    if (fs.existsSync(APPEARANCE_FILE)) {
      return JSON.parse(fs.readFileSync(APPEARANCE_FILE, "utf-8"));
    }
  } catch (e) {
    logger.error("Read appearance.json failed", { error: e instanceof Error ? e.message : String(e) });
  }
  return {};
}

function writeAppearance(data: unknown) {
  try {
    const tmp = `${APPEARANCE_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, APPEARANCE_FILE);
  } catch (e) {
    logger.error("Write appearance.json failed", { error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}


const router = Router();

router.get("/", (req, res) => {
  res.json(readAppearance());
});

router.post("/", requireAdmin, (req, res) => {
  try {
    const body = req.body || {};
    const current = readAppearance();
    // 白名单：仅允许以下字段写入，防止原型污染和任意字段注入
    const ALLOWED_FIELDS = ["siteName", "faviconUrl", "customHead", "customBody", "backgroundUrl", "backgroundOpacity", "theme"];
    const next = { ...current };
    for (const key of ALLOWED_FIELDS) {
      if (key in body) next[key] = body[key];
    }
    writeAppearance(next);
    res.json({ success: true });
  } catch (e) {
    logger.error("Save appearance error", { error: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ error: e instanceof Error ? e.message : "保存失败" });
  }
});

router.post("/upload/:type", requireAdmin, upload.single("file"), (req, res) => {
  const type = req.params.type;
  if (type !== "favicon" && type !== "background") {
    res.status(400).json({ error: "Invalid upload type" });
    return;
  }
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, url });
  } catch (e) {
    logger.error("Upload error", { type, error: e instanceof Error ? e.message : String(e) });
    res.status(500).json({ error: e instanceof Error ? e.message : "上传失败" });
  }
});

router.delete("/upload/favicon", requireAdmin, (_req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.startsWith("favicon_") || f.startsWith("file-"));
    for (const f of files) {
      if (f.includes("favicon")) fs.unlinkSync(path.join(UPLOADS_DIR, f));
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "删除失败" });
  }
});

router.delete("/upload/background", requireAdmin, (_req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.startsWith("background_") || f.startsWith("file-"));
    for (const f of files) {
      if (f.includes("background") || f.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
        try { fs.unlinkSync(path.join(UPLOADS_DIR, f)); } catch {}
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "删除失败" });
  }
});

export default router;
