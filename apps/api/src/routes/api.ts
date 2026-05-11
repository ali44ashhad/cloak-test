import crypto from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import {
  SLUG_COLLATION,
  docToLink,
  isDuplicateKeyError,
  links,
  visitors,
  dailyClicks,
} from "../db.js";
import type { LinkDoc } from "../types.js";

export const apiRouter = Router();

const SLUG_PATTERN = /^[a-zA-Z0-9._-]+$/;
const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function generateSlug(length = 7): string {
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += SLUG_ALPHABET.charAt(bytes[i]! % SLUG_ALPHABET.length);
  }
  return result;
}

function sanitizeSlug(value: string): string {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\s+/g, "-");
}

function getOrigin(req: Request): string {
  if (process.env.CLOAK_PUBLIC_ORIGIN) {
    return process.env.CLOAK_PUBLIC_ORIGIN.replace(/\/+$/, "");
  }
  const proto =
    typeof req.headers["x-forwarded-proto"] === "string"
      ? (req.headers["x-forwarded-proto"].split(",")[0] ?? req.protocol)
      : req.protocol;
  const host =
    typeof req.headers["x-forwarded-host"] === "string"
      ? req.headers["x-forwarded-host"]
      : req.headers.host;
  return `${proto}://${host}`;
}

const httpUrl = z
  .string()
  .trim()
  .url("Must be a valid URL.")
  .refine(
    (value) => /^https?:\/\//i.test(value),
    "Only http:// or https:// URLs are allowed."
  );

const createSchema = z.object({
  botUrl: httpUrl,
  userUrl: httpUrl,
  slug: z.string().max(48).optional(),
  campaignName: z.string().max(60).optional(),
});

const updateSchema = z
  .object({
    campaignName: z.string().max(60).optional(),
    botUrl: httpUrl.optional(),
    userUrl: httpUrl.optional(),
    active: z.boolean().optional(),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: "Provide at least one field to update.",
  });

async function findBySlug(slug: string): Promise<LinkDoc | null> {
  return links().findOne({ slug }, { collation: SLUG_COLLATION });
}

apiRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

apiRouter.get(
  "/links",
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const origin = getOrigin(req);
    const docs = await links()
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ links: docs.map((doc) => docToLink(doc, origin)) });
  } catch (err) {
    next(err);
  }
  }
);

apiRouter.post(
  "/links",
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: parsed.error.flatten().fieldErrors,
      });
    }
    const { botUrl, userUrl } = parsed.data;
    const campaignName = (parsed.data.campaignName ?? "").trim();

    let slug = parsed.data.slug ? sanitizeSlug(parsed.data.slug) : "";
    if (slug) {
      if (!SLUG_PATTERN.test(slug)) {
        return res.status(400).json({
          error: "Slug may only contain letters, numbers, '.', '-', '_'.",
        });
      }
      if (slug.length > 48) {
        return res
          .status(400)
          .json({ error: "Slug must be 48 characters or fewer." });
      }
      if (await findBySlug(slug)) {
        return res.status(409).json({ error: "Slug is already in use." });
      }
    } else {
      let attempts = 0;
      do {
        slug = generateSlug();
        attempts += 1;
      } while ((await findBySlug(slug)) && attempts < 12);
    }

    const doc: LinkDoc = {
      _id: crypto.randomUUID(),
      campaignName,
      botUrl,
      userUrl,
      slug,
      active: true,
      createdAt: new Date(),
      clicks: 0,
      uniqueVisitors: 0,
      lastClickAt: null,
    };

    try {
      await links().insertOne(doc);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return res
          .status(409)
          .json({ error: "Slug is already in use." });
      }
      throw err;
    }

    return res.status(201).json({ link: docToLink(doc, getOrigin(req)) });
  } catch (err) {
    next(err);
  }
  }
);

apiRouter.patch(
  "/links/:id",
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: parsed.error.flatten().fieldErrors,
      });
    }
    const data = parsed.data;
    const $set: Partial<LinkDoc> = {};
    if (typeof data.campaignName === "string") {
      $set.campaignName = data.campaignName.trim();
    }
    if (typeof data.botUrl === "string") $set.botUrl = data.botUrl;
    if (typeof data.userUrl === "string") $set.userUrl = data.userUrl;
    if (typeof data.active === "boolean") $set.active = data.active;

    const updated = await links().findOneAndUpdate(
      { _id: req.params.id },
      { $set },
      { returnDocument: "after" }
    );

    if (!updated) {
      return res.status(404).json({ error: "Link not found." });
    }

    return res.json({ link: docToLink(updated, getOrigin(req)) });
  } catch (err) {
    next(err);
  }
  }
);

apiRouter.delete(
  "/links/:id",
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await links().deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Link not found." });
    }
    await visitors().deleteMany({ linkId: req.params.id });
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
  }
);

apiRouter.get(
  "/stats",
  async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [total, active, uniqueAgg, daily] = await Promise.all([
      links().countDocuments({}),
      links().countDocuments({ active: true }),
      links()
        .aggregate<{ sum: number }>([
          { $group: { _id: null, sum: { $sum: "$uniqueVisitors" } } },
        ])
        .toArray(),
      dailyClicks().findOne({ _id: today }),
    ]);
    return res.json({
      total,
      active,
      todayClicks: daily?.count ?? 0,
      uniqueVisitors: uniqueAgg[0]?.sum ?? 0,
    });
  } catch (err) {
    next(err);
  }
  }
);
