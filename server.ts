import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import expressStaticGzip from "express-static-gzip";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { SESSION_SECRET } from "./server/lib/auth.js";
import { logger } from "./server/lib/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(SESSION_SECRET));
  app.use(compression());

  try {
    const buildsRouter = (await import("./server/routes/builds.js")).default;
    const { default: collectRouter, startAutoCollectJob } = await import("./server/routes/collect.js");
    const configRouter = (await import("./server/routes/config.js")).default;
    const { default: dailyPasswordRouter, startDailyPwdJob } = await import("./server/routes/dailyPassword.js");
    const communityRouter = (await import("./server/routes/community.js")).default;
    const authRouter = (await import("./server/routes/auth.js")).default;
    const { testModel, chatWithModel } = await import("./server/lib/collector.js");
    const { readCollectSettings } = await import("./server/lib/collectSettings.js");

    app.use("/api/builds", buildsRouter);
    app.use("/api/collect", collectRouter);
    app.use("/api/config", configRouter);
    app.use("/api/daily-password", dailyPasswordRouter);
    app.use("/api/community", communityRouter);
    app.use("/api/auth", authRouter);

    app.post("/api/model/test", async (req, res) => {
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

    app.post("/api/model/chat", async (req, res) => {
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
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    startDailyPwdJob();
    startAutoCollectJob();

  } catch (err) {
    logger.error("CRITICAL STARTUP ERROR", { error: err instanceof Error ? err.message : String(err) });
    app.all("*", (req, res) => {
      res.status(500).send(`
        <h1>Server Startup Error</h1>
        <pre style="color: red; white-space: pre-wrap; word-wrap: break-word;">
${err instanceof Error ? err.stack : String(err)}
        </pre>
      `);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
