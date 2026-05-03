import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import { rateLimit } from "../lib/rateLimiter.js";
import { queryPosts, createPost, addReaction, deletePost, getPostById } from "../lib/communityStore.js";
import { getRecentActivity } from "../lib/communityActivity.js";
import { parseUploadFile, uploadToCF, deleteFromCF } from "../lib/communityUpload.js";
import { getCommentsByPostId, addComment, deleteComment, getCommentById } from "../lib/commentStore.js";
import { setFileETag } from "../lib/etag.js";

const router = Router();

const VALID_EMOJIS = ["fire", "money", "skull"] as const;

router.get("/posts", setFileETag("scripts/community_posts.json", (req) => `${req.query.sort || "new"}-${req.query.tag || ""}`), (req, res) => {
  try {
    const sort = req.query.sort === "hot" ? "hot" : "new";
    const tag = typeof req.query.tag === "string" ? req.query.tag.trim() : undefined;
    const posts = queryPosts(sort, tag);
    res.json({ success: true, data: posts });
  } catch (e) {
    res.status(500).json({ success: false, error: "获取社区帖子失败" });
  }
});

router.post("/posts", requireAuth, rateLimit(20, 60 * 60 * 1000, "发帖请求过于频繁，请 1 小时后再试"), (req, res) => {
  try {
    const body = req.body || {};
    const imageUrl = String(body.imageUrl || "").trim();
    const thumbUrl = String(body.thumbUrl || "").trim();
    const description = String(body.description || "").trim();
    const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    const user = (req as any).authUser;
    const uploader = user?.username || "匿名";

    // 1.4 允许无图片发帖，但至少要有描述
    if (!imageUrl && !description) {
      return res.status(400).json({ success: false, error: "图片或内容至少填写一项" });
    }

    const post = createPost({ imageUrl, thumbUrl: thumbUrl || imageUrl, description, tags, uploader });
    res.json({ success: true, data: post });
  } catch (e) {
    res.status(500).json({ success: false, error: "发帖失败" });
  }
});

router.delete("/posts/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const post = getPostById(id);
    if (!post) {
      return res.status(404).json({ success: false, error: "帖子不存在" });
    }
    const user = (req as any).authUser;
    if (post.uploader !== user.username && user.role !== "admin") {
      return res.status(403).json({ success: false, error: "无权删除他人帖子" });
    }
    const deletedPost = deletePost(id);
    if (deletedPost?.imageUrl) {
      await deleteFromCF(deletedPost.imageUrl);
    }
    if (deletedPost?.thumbUrl && deletedPost.thumbUrl !== deletedPost.imageUrl) {
      await deleteFromCF(deletedPost.thumbUrl);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "删除失败" });
  }
});

router.post("/upload", requireAuth, rateLimit(10, 60 * 60 * 1000, "上传请求过于频繁，请 1 小时后再试"), async (req, res) => {
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

    res.json({ success: true, url: result.url, thumbUrl: result.thumbUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "图片上传异常";
    res.status(500).json({ success: false, error: message });
  }
});

router.post("/posts/:id/react", requireAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const emoji = req.body?.emoji;
    const user = (req as any).authUser;
    const userId = user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "请先登录才能进行互动" });
    }

    if (!VALID_EMOJIS.includes(emoji)) {
      return res.status(400).json({ success: false, error: "无效的 Emoji 类型" });
    }

    try {
      const updated = addReaction(postId, emoji, userId);
      if (!updated) {
        return res.status(404).json({ success: false, error: "帖子不存在" });
      }
      res.json({ success: true, data: updated });
    } catch (err) {
      return res.status(400).json({ success: false, error: err instanceof Error ? err.message : "互动失败" });
    }
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

// ============ 社区评论 API ============
router.get("/posts/:id/comments", (req, res) => {
  try {
    const postId = req.params.id;
    res.json(getCommentsByPostId(postId));
  } catch (e) {
    res.status(500).json({ error: "获取评论失败" });
  }
});

router.post("/posts/:id/comments", requireAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const { content } = req.body || {};
    const user = (req as any).authUser;
    if (!content || !user?.username) {
      return res.status(400).json({ error: "内容不能为空" });
    }
    const newComment = addComment(postId, String(content), user.username);
    res.json({ success: true, data: newComment });
  } catch (e) {
    res.status(500).json({ error: "添加评论失败" });
  }
});

router.delete("/posts/:id/comments/:commentId", requireAuth, (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = getCommentById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, error: "评论不存在" });
    }
    const user = (req as any).authUser;
    if (comment.author !== user.username && user.role !== "admin") {
      return res.status(403).json({ success: false, error: "无权删除他人评论" });
    }
    deleteComment(commentId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "删除评论失败" });
  }
});

export default router;
