import type { IncomingMessage, ServerResponse } from "node:http";
import handler from "../../apps/api/src/handler.js";

/**
 * Dedicated Vercel serverless function for cloaked redirects.
 *
 * Lives at /api/r/:slug. The vercel.json rewrite maps the public-facing
 * /r/:slug URL to this function so visitors hit it transparently.
 *
 * We delegate to the same Express handler used by /api/[...path].ts so the
 * redirect logic (bot detection, click recording, unique-visitor hashing)
 * stays in a single place inside apps/api/src/routes/redirect.ts.
 *
 * Having this as an explicit function file (rather than relying on the
 * catch-all alone) is required because Vercel resolves rewrite destinations
 * against concrete function paths and was returning NOT_FOUND when the only
 * available match was the [...path] catch-all.
 */
export default async function vercelRedirect(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  await handler(req, res);
}
