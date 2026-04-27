import { Router } from "express";
import { queryPosts, createPost, addReaction } from "../lib/communityStore.js";
import { getRecentActivity } from "../lib/communityActivity.js";
import { parseUploadFile, uploadToCF } from "../lib/communityUpload.js";

const router = Router();

const VALID_EMOJIS = ["fire", "money", "skull"] as const;

router.get("/posts", (req, res) => {
  try {
    const sort = req.query.sort === "hot" ? "hot" : "new";
    const tag = typeof req.query.tag === "string" ? req.query.tag.trim() : undefined;
    const posts = queryPosts(sort, tag);
    res.json({ success: true, data: posts });
  } catch (e) {
    res.status(500).json({ success: false, error: "获取社区帖子失败" });
  }
});

router.post("/posts", (req, res) => {
  try {
    const body = req.body || {};
    const imageUrl = String(body.imageUrl || "").trim();
    const description = String(body.description || "").trim();
    const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    const uploader = String(body.uploader || "匿名").trim();

    if (!imageUrl) {
      return res.status(400).json({ success: false, error: "请先上传图片" });
    }

    const post = createPost({ imageUrl, description, tags, uploader });
    res.json({ success: true, data: post });
  } catch (e) {
    res.status(500).json({ success: false, error: "发帖失败" });
  }
});

router.post("/upload", async (req, res) => {
  try {
    const ct = req.headers["content-type"] || "";
    if (!ct.includes("multipart/form-data")) {
      return res.status(400).json({ success: false, error: "请使用 multipart/form-data 上传文件" });
    }

    const { buffer, filename } = await parseUploadFile(req);
    const result = await uploadToCF(buffer, filename);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error || "上传失败" });
    }

    res.json({ success: true, url: result.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "图片上传异常";
    res.status(500).json({ success: false, error: message });
  }
});

router.post("/posts/:id/react", (req, res) => {
  try {
    const postId = req.params.id;
    const emoji = req.body?.emoji;

    if (!VALID_EMOJIS.includes(emoji)) {
      return res.status(400).json({ success: false, error: "无效的 Emoji 类型" });
    }

    const updated = addReaction(postId, emoji);
    if (!updated) {
      return res.status(404).json({ success: false, error: "帖子不存在" });
    }

    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: "互动失败" });
  }
});

router.get("/activity", (req, res) => {
  try {
    const activity = getRecentActivity(20);
    res.json({ success: true, data: activity });
  } catch (e) {
    res.status(500).json({ success: false, error: "获取动态失败" });
  }
});

export default router;
