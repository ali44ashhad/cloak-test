import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { apiRouter } from "./routes/api.js";
import { redirectRouter } from "./routes/redirect.js";
import { connectMongo, disconnectMongo, isHealthy } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
 * Load environment variables from the project root .env (preferred) or
 * server/.env as a fallback. We resolve relative to this file rather than
 * cwd so the loader works regardless of where `node` is invoked from.
 */
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const SERVER_DIR = path.resolve(__dirname, "..");

const envCandidates = [
  path.join(PROJECT_ROOT, ".env"),
  path.join(SERVER_DIR, ".env"),
];
for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    console.log(`[cloak] loaded env from ${candidate}`);
    break;
  }
}

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB ?? "cloak";

if (!MONGODB_URI) {
  console.error(
    "\n[cloak] FATAL: MONGODB_URI is not set.\n" +
      "        Copy .env.example to .env and fill in your MongoDB connection string.\n" +
      "        Examples:\n" +
      "          MONGODB_URI=mongodb://localhost:27017\n" +
      "          MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net\n"
  );
  process.exit(1);
}

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
app.use("/r", redirectRouter);

const distPath = path.resolve(PROJECT_ROOT, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { index: false }));
  app.get("*", (req: Request, res: Response, next: NextFunction) => {
    if (
      req.path.startsWith("/api/") ||
      req.path.startsWith("/r/") ||
      req.path.startsWith("/assets/")
    ) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("[cloak] unhandled error:", err);
  if (res.headersSent) return;
  res.status(500).json({ error: err?.message ?? "Internal server error." });
};
app.use(errorHandler);

async function bootstrap(): Promise<void> {
  try {
    await connectMongo(MONGODB_URI!, MONGODB_DB);
  } catch (err) {
    console.error(
      "[cloak] FATAL: could not connect to MongoDB.",
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`[cloak] server listening on http://${HOST}:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[cloak] received ${signal}, shutting down…`);
    server.close(async () => {
      await disconnectMongo();
      process.exit(0);
    });
    setTimeout(() => {
      console.warn("[cloak] forcing exit after 10s timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void bootstrap();
