import type { IncomingMessage, ServerResponse } from "node:http";
import handler from "../apps/api/src/handler.js";

export default async function vercelApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // Delegate to the compiled server handler (which bootstraps Mongo + Express).
  await handler(req, res);
}

