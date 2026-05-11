import {
  MongoClient,
  type CollationOptions,
  type Collection,
  type Db,
} from "mongodb";
import type {
  CloakedLink,
  DailyClickDoc,
  LinkDoc,
  VisitorDoc,
} from "./types.js";

/**
 * The slug index uses a case-insensitive collation so that "Sale" and "sale"
 * are treated as the same identifier. The same collation must be applied to
 * every query that filters on `slug` for the index to be used.
 */
export const SLUG_COLLATION: CollationOptions = {
  locale: "en",
  strength: 2,
};

let client: MongoClient | null = null;
let database: Db | null = null;

export async function connectMongo(uri: string, dbName: string): Promise<void> {
  if (client) return;

  const next = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000,
    appName: "cloak-dashboard",
  });

  await next.connect();
  client = next;
  database = next.db(dbName);

  await Promise.all([
    database
      .collection<LinkDoc>("links")
      .createIndex(
        { slug: 1 },
        { unique: true, collation: SLUG_COLLATION, name: "uniq_slug_ci" }
      ),
    database
      .collection<LinkDoc>("links")
      .createIndex({ createdAt: -1 }, { name: "createdAt_desc" }),
    database
      .collection<VisitorDoc>("visitors")
      .createIndex(
        { linkId: 1, visitorHash: 1 },
        { unique: true, name: "uniq_visitor_per_link" }
      ),
  ]);

  const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
  console.log(`[cloak] connected to MongoDB at ${safeUri} (db: ${dbName})`);
}

export async function disconnectMongo(): Promise<void> {
  if (!client) return;
  await client.close();
  client = null;
  database = null;
}

function requireDb(): Db {
  if (!database) {
    throw new Error(
      "MongoDB is not connected yet. Call connectMongo() at startup."
    );
  }
  return database;
}

export function links(): Collection<LinkDoc> {
  return requireDb().collection<LinkDoc>("links");
}

export function visitors(): Collection<VisitorDoc> {
  return requireDb().collection<VisitorDoc>("visitors");
}

export function dailyClicks(): Collection<DailyClickDoc> {
  return requireDb().collection<DailyClickDoc>("daily_clicks");
}

export async function isHealthy(): Promise<boolean> {
  if (!client || !database) return false;
  try {
    await database.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export function docToLink(doc: LinkDoc, origin: string): CloakedLink {
  return {
    id: doc._id,
    campaignName: doc.campaignName,
    botUrl: doc.botUrl,
    userUrl: doc.userUrl,
    slug: doc.slug,
    cloakedUrl: `${origin}/r/${doc.slug}`,
    active: doc.active,
    createdAt: doc.createdAt.toISOString(),
    clicks: doc.clicks,
    uniqueVisitors: doc.uniqueVisitors,
    lastClickAt: doc.lastClickAt ? doc.lastClickAt.toISOString() : null,
  };
}

/**
 * MongoDB driver throws `MongoServerError` with `code === 11000` on
 * unique-index violations. Use this helper instead of relying on the loose
 * `any`-typed error shape.
 */
export function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: number }).code === 11000
  );
}
