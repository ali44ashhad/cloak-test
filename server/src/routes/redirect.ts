import crypto from "node:crypto";
import { Router, type Request } from "express";
import {
  SLUG_COLLATION,
  dailyClicks,
  isDuplicateKeyError,
  links,
  visitors,
} from "../db.js";
import { detectBot } from "../botDetection.js";

export const redirectRouter = Router();

function hashVisitor(ip: string, ua: string): string {
  return crypto
    .createHash("sha256")
    .update(`${ip}|${ua}`)
    .digest("hex")
    .slice(0, 32);
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    const first = forwarded.split(",")[0];
    if (first) return first.trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function statusPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: dark; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
             background: radial-gradient(circle at top, rgba(59,130,246,0.12), transparent 55%), #0a0a0a;
             color: #f1f5f9; margin: 0; min-height: 100vh; display: flex;
             align-items: center; justify-content: center; padding: 24px; }
      .card { max-width: 440px; width: 100%; background: rgba(17, 24, 39, 0.85);
              border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
              padding: 32px; text-align: center; backdrop-filter: blur(12px); }
      h1 { font-size: 1.125rem; margin: 0 0 8px; font-weight: 600; }
      p { color: #94a3b8; margin: 0; font-size: 0.875rem; line-height: 1.5; }
      code { background: rgba(255,255,255,0.08); padding: 2px 6px;
             border-radius: 4px; color: #93c5fd; font-size: 0.85em; }
      a { display: inline-block; margin-top: 20px; color: #93c5fd;
          text-decoration: none; font-weight: 500; font-size: 0.875rem;
          border: 1px solid rgba(255,255,255,0.1); padding: 8px 14px;
          border-radius: 8px; transition: all 0.15s; }
      a:hover { background: rgba(255,255,255,0.06); color: #bfdbfe; }
    </style>
  </head>
  <body>
    <div class="card">${body}<a href="/">&larr; Back to dashboard</a></div>
  </body>
</html>`;
}

redirectRouter.get("/:slug", async (req, res, next) => {
  try {
    const slug = req.params.slug;
    if (!slug) {
      return res
        .status(404)
        .type("html")
        .send(
          statusPage(
            "Link not found",
            `<h1>Link not found</h1><p>No slug was supplied.</p>`
          )
        );
    }

    const doc = await links().findOne(
      { slug },
      { collation: SLUG_COLLATION }
    );

    if (!doc) {
      return res
        .status(404)
        .type("html")
        .send(
          statusPage(
            "Link not found",
            `<h1>Link not found</h1>
             <p>No cloaked URL with slug <code>/r/${escapeHtml(slug)}</code> exists.</p>`
          )
        );
    }

    if (!doc.active) {
      return res
        .status(410)
        .type("html")
        .send(
          statusPage(
            "Redirect paused",
            `<h1>Redirect paused</h1>
             <p>The cloaked link <strong>${escapeHtml(
               doc.campaignName || `/r/${doc.slug}`
             )}</strong> is currently inactive. Toggle it on from the dashboard to resume redirects.</p>`
          )
        );
    }

    const userAgent =
      typeof req.headers["user-agent"] === "string"
        ? req.headers["user-agent"]
        : "";
    const previewParam =
      typeof req.query.preview === "string" ? req.query.preview : null;
    const detection = detectBot(userAgent, previewParam);

    const ip = getClientIp(req);
    const visitorHash = hashVisitor(ip, userAgent);
    const now = new Date();

    /*
     * MongoDB transactions require a replica set. To stay deployment-friendly
     * (works against a plain `mongod` standalone, Docker container, or Atlas
     * shared cluster) we use individual atomic operations. Each one is safe
     * in isolation; the worst case on a partial crash is an under-counted
     * stat, never an inconsistent redirect.
     */
    try {
      await Promise.all([
        links().updateOne(
          { _id: doc._id },
          { $inc: { clicks: 1 }, $set: { lastClickAt: now } }
        ),
        dailyClicks().updateOne(
          { _id: todayKey() },
          { $inc: { count: 1 } },
          { upsert: true }
        ),
      ]);

      let isNewVisitor = false;
      try {
        await visitors().insertOne({
          linkId: doc._id,
          visitorHash,
          firstSeenAt: now,
        });
        isNewVisitor = true;
      } catch (err) {
        if (!isDuplicateKeyError(err)) {
          throw err;
        }
      }

      if (isNewVisitor) {
        await links().updateOne(
          { _id: doc._id },
          { $inc: { uniqueVisitors: 1 } }
        );
      }
    } catch (err) {
      console.error("[cloak] failed to record visit:", err);
    }

    const destination = detection.isBot ? doc.botUrl : doc.userUrl;

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, max-age=0"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("X-Cloak-Branch", detection.isBot ? "bot" : "user");
    res.setHeader("X-Cloak-Reason", detection.reason);

    return res.redirect(302, destination);
  } catch (err) {
    next(err);
  }
});
