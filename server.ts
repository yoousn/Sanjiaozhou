import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  try {
    const buildsRouter = (await import("./server/routes/builds.js")).default;
    const { default: collectRouter, startAutoCollectJob } = await import("./server/routes/collect.js");
    const configRouter = (await import("./server/routes/config.js")).default;
    const { default: dailyPasswordRouter, startDailyPwdJob } = await import("./server/routes/dailyPassword.js");
    const communityRouter = (await import("./server/routes/community.js")).default;
    const authRouter = (await import("./server/routes/auth.js")).default;
    const { testModel } = await import("./server/lib/collector.js");
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
        console.error("API MODEL TEST Error:", e);
        res.status(500).json({ error: e instanceof Error ? e.message : "Model test failed" });
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
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    startDailyPwdJob();
    startAutoCollectJob();

  } catch (err) {
    console.error("CRITICAL STARTUP ERROR:", err);
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
