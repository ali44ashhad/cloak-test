import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import type { IncomingMessage, ServerResponse } from "node:http";
import { connectMongo } from "./db.js";
import { createServerApp } from "./serverApp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const SERVER_DIR = path.resolve(__dirname, "..");

let app: ReturnType<typeof createServerApp> | null = null;
let initPromise: Promise<void> | null = null;

function loadEnvOnce(): void {
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
}

async function initOnce(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    loadEnvOnce();
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB ?? "cloak";
    if (!uri) {
      throw new Error("MONGODB_URI is not set.");
    }
    await connectMongo(uri, dbName);
    app = createServerApp();
  })();
  return initPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  await initOnce();
  if (!app) {
    res.statusCode = 500;
    res.end("Server not initialized");
    return;
  }
  // Express apps are request listeners.
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(
    req,
    res
  );
}

