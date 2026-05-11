import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { apiRouter } from "./routes/api.js";
import { redirectRouter } from "./routes/redirect.js";
import { isHealthy } from "./db.js";

export function createServerApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", true);
  app.use(cors());
  app.use(express.json({ limit: "256kb" }));

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const elapsed = Date.now() - start;
      console.log(
        `[cloak] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${elapsed}ms)`
      );
    });
    next();
  });

  app.get("/api/health", async (_req, res) => {
    const dbOk = await isHealthy();
    res.status(dbOk ? 200 : 503).json({
      ok: dbOk,
      db: dbOk ? "connected" : "unreachable",
    });
  });

  app.use("/api", apiRouter);

  // Local: `/r/:slug`
  app.use("/r", redirectRouter);
  // Vercel rewrite target: `/api/r/:slug`
  app.use("/api/r", redirectRouter);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error("[cloak] unhandled error:", err);
    if (res.headersSent) return;
    res.status(500).json({ error: err?.message ?? "Internal server error." });
  };
  app.use(errorHandler);

  return app;
}

