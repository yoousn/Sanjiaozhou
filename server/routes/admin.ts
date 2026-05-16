import { Router } from "express";
import { requireAdmin } from "../lib/auth.js";
import { listAccessLogs, getAccessLogStats, clearAccessLogs } from "../lib/accessLog.js";

const router = Router();

router.get("/access-logs", requireAdmin, (req, res) => {
  const limit = Number(req.query.limit) || 500;
  res.json({ success: true, data: listAccessLogs(limit), stats: getAccessLogStats() });
});

router.delete("/access-logs", requireAdmin, (_req, res) => {
  const removed = clearAccessLogs();
  res.json({ success: true, removed });
});

export default router;
