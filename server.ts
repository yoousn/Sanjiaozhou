import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

import buildsRouter from "./server/routes/builds.js";
import collectRouter, { startAutoCollectJob } from "./server/routes/collect.js";
import configRouter from "./server/routes/config.js";
import dailyPasswordRouter, { startDailyPwdJob } from "./server/routes/dailyPassword.js";
import communityRouter from "./server/routes/community.js";
import { testModel } from "./server/lib/collector.js";
import { readCollectSettings } from "./server/lib/collectSettings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  app.use("/api/builds", buildsRouter);
  app.use("/api/collect", collectRouter);
  app.use("/api/config", configRouter);
  app.use("/api/daily-password", dailyPasswordRouter);
  app.use("/api/community", communityRouter);

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  startDailyPwdJob();
  startAutoCollectJob();
}

startServer();
