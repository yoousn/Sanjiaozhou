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

// 诊断：查看 Node 收到的代理头，定位反代 IP 透传问题
router.get("/debug-headers", requireAdmin, (req, res) => {
  const ipHeaders = [
    "cf-connecting-ip",
    "true-client-ip",
    "x-real-ip",
    "x-forwarded-for",
    "x-forwarded-proto",
    "x-forwarded-host",
    "cf-ipcountry",
    "cf-region",
    "cf-ipcity",
    "host",
    "user-agent",
  ];
  const picked: Record<string, string | undefined> = {};
  for (const name of ipHeaders) {
    const v = req.headers[name];
    picked[name] = Array.isArray(v) ? v[0] : v;
  }
  res.json({
    success: true,
    socketRemoteAddress: req.socket?.remoteAddress,
    expressReqIp: req.ip,
    expressReqIps: req.ips,
    trustProxyEnabled: req.app.get("trust proxy"),
    headers: picked,
    allHeaders: req.headers,
  });
});

export default router;
