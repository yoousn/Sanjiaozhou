import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import expressStaticGzip from "express-static-gzip";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { SESSION_SECRET, requireAdmin } from "./server/lib/auth.js";
import { logger } from "./server/lib/logger.js";
import { accessLogMiddleware } from "./server/lib/accessLog.js";

function readAppearance() {
  try {
    const file = path.join(process.cwd(), "runtime", "appearance.json");
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
  } catch { /* ignore */ }
  return {};
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

async function startServer() {
  const app = express();
  // 隐藏 Express 指纹，避免泄露技术栈
  app.disable("x-powered-by");
  // 在 Cloudflare/OpenResty 反代后，必须信任代理，rateLimiter 与访问日志才能拿到真实客户端 IP
  // 设为 true 表示信任所有跳数（容器内本来就只能被反代访问，安全风险可控）
  app.set("trust proxy", true);
  // 限制 JSON body 大小，避免被刷大请求
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser(SESSION_SECRET));
  app.use(compression());
  // 页面访问日志（不记录 API 和静态资源）
  app.use(accessLogMiddleware);

  try {
    const buildsRouter = (await import("./server/routes/builds.js")).default;
    const { default: collectRouter, startAutoCollectJob } = await import("./server/routes/collect.js");
    const configRouter = (await import("./server/routes/config.js")).default;
    const { default: dailyPasswordRouter, startDailyPwdJob } = await import("./server/routes/dailyPassword.js");
    const communityRouter = (await import("./server/routes/community.js")).default;
    const godspotRouter = (await import("./server/routes/godspot.js")).default;
    const authRouter = (await import("./server/routes/auth.js")).default;
    const adminRouter = (await import("./server/routes/admin.js")).default;
    const { testModel, chatWithModel } = await import("./server/lib/collector.js");
    const { readCollectSettings } = await import("./server/lib/collectSettings.js");

    app.use("/api/builds", buildsRouter);
    app.use("/api/collect", collectRouter);
    app.use("/api/config", configRouter);
    app.use("/api/daily-password", dailyPasswordRouter);
    app.use("/api/community", communityRouter);
    app.use("/api/godspot", godspotRouter);
    app.use("/api/auth", authRouter);
    app.use("/api/admin", adminRouter);

    const appearanceRouter = (await import("./server/routes/appearance.js")).default;
    app.use("/api/appearance", appearanceRouter);
    app.use("/uploads", express.static(path.join(process.cwd(), "runtime", "uploads")));
    app.use("/godspot-files", express.static(path.join(process.cwd(), "runtime", "godspot", "videos")));

    app.post("/api/model/test", requireAdmin, async (req, res) => {
      try {
        const body = req.body || {};
        const settings = readCollectSettings();
        const result = await testModel(String(body.model || settings.defaultModel));
        res.json(result);
      } catch (e) {
        logger.error("API MODEL TEST Error", { error: e instanceof Error ? e.message : String(e) });
        res.status(500).json({ error: e instanceof Error ? e.message : "Model test failed" });
      }
    });

    app.post("/api/model/chat", requireAdmin, async (req, res) => {
      try {
        const body = req.body || {};
        const settings = readCollectSettings();
        const rawMessages = Array.isArray(body.messages) ? body.messages : [];
        const messages = rawMessages
          .map((message: any) => ({ role: String(message?.role || "user"), content: String(message?.content || "").trim() }))
          .filter((message: { role: string; content: string }) => message.content);
        if (messages.length === 0) {
          res.status(400).json({ error: "请输入聊天内容" });
          return;
        }
        const result = await chatWithModel(String(body.model || settings.defaultModel), messages);
        res.json(result);
      } catch (e) {
        logger.error("API MODEL CHAT Error", { error: e instanceof Error ? e.message : String(e) });
        res.status(500).json({ error: e instanceof Error ? e.message : "Model chat failed" });
      }
    });

    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(
        expressStaticGzip(distPath, {
          enableBrotli: true,
          orderPreference: ["br"],
          serveStatic: {
            maxAge: 0,
            etag: true,
            setHeaders: (res, filePath) => {
              if (filePath.includes("/assets/")) {
                res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
              }
            },
          } as any,
        })
      );
      app.get("*", (req, res) => {
        if (req.path.startsWith("/api/")) {
          return res.status(404).json({ error: "Not Found" });
        }
        const appearance = readAppearance();
        let html = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
        const siteName = appearance.siteName || "坤坤改枪码";
        const faviconUrl = appearance.faviconUrl || "";
        html = html.replace(/<title>.*?<\/title>/, `<title>${siteName}</title>`);
        if (faviconUrl) {
          html = html.replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${faviconUrl}" />`);
        }
        if (appearance.customHead) {
          html = html.replace("</head>", appearance.customHead + "</head>");
        }
        if (appearance.customBody) {
          html = html.replace("</body>", appearance.customBody + "</body>");
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
      });
    }

    startDailyPwdJob();
    startAutoCollectJob();

  } catch (err) {
    logger.error("CRITICAL STARTUP ERROR", { error: err instanceof Error ? err.stack || err.message : String(err) });
    // 启动异常时只对外暴露通用错误，详情仅写日志，避免泄露绝对路径与模块结构
    app.all("/api/*", (_req, res) => {
      res.status(500).json({ error: "Server Startup Error" });
    });
    app.all("*", (_req, res) => {
      res.status(500).send("<h1>Server Startup Error</h1><p>Service is temporarily unavailable.</p>");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
