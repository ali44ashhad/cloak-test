# Cloak — URL Cloaking Dashboard

A production-ready full-stack URL cloaking system. A single short URL serves
**different destinations to bots (e.g. Googlebot) and to real users** —
**at the HTTP layer**, before any HTML is sent — and the React dashboard
manages campaigns, status, and live analytics.

## Architecture

```
┌─────────────────────┐         ┌───────────────────────────────┐
│  React + TS + Vite  │  /api   │  Express + MongoDB driver     │
│  (dashboard)        │ ───────▶│  REST API: /api/links, /stats │
│  Tailwind, hot-toast│         │                               │
└─────────────────────┘         │  Cloaking: GET /r/:slug       │
                                │   1. lookup slug in MongoDB   │
   user hits /r/:slug   ──────▶ │   2. inspect User-Agent       │
                                │   3. 302 → botUrl OR userUrl  │
                                │   4. record click + visitor   │
                                └───────────────────────────────┘
                                          │
                                          ▼
                                    MongoDB (any deployment)
                                    ├── links
                                    ├── visitors
                                    └── daily_clicks
```

The redirect is performed **server-side via an HTTP 302** — so even bots
that don't run JavaScript (real Googlebot, curl, etc.) follow the cloaked
branch. The SPA frontend handles only the management UI.

## Features

### Server
- **Server-side cloaking** at `GET /r/:slug` with HTTP 302 redirects
- **Bot detection** via User-Agent regex (Googlebot, AdsBot, Bingbot,
  Yandex, Baidu, AhrefsBot, headless browsers, scripted clients, …)
- **`?preview=user` / `?preview=bot`** override for testing each branch
- **MongoDB persistence** via the official `mongodb` driver — atomic
  `$inc` operators for click counters, unique compound index on
  `(linkId, visitorHash)` so duplicate-key errors fall through cleanly
  when a returning visitor hits a link
- **`.env` based configuration** via `dotenv`, with friendly startup
  errors if `MONGODB_URI` is missing
- **Privacy-friendly unique-visitor tracking** — `sha256(ip + UA)` hashed
  to 32 chars, no cookies, no PII stored
- **Daily click counter** for the "Today's Clicks" stat
- **REST API** with Zod validation (`POST /api/links`, `PATCH`, `DELETE`,
  `GET /api/links`, `GET /api/stats`)
- **`Cache-Control: no-store`** and `X-Robots-Tag: noindex` headers on
  redirects so caches and crawlers don't pin the wrong destination
- **Graceful shutdown** — `SIGINT`/`SIGTERM` close the HTTP server and the
  Mongo connection cleanly
- Request logging, CORS, error middleware, `trust proxy` for reverse
  proxies

### Dashboard
- Two-panel layout: URL input form (left), generated cloaked URLs (right)
- Stats cards: total URLs, active redirects, today's clicks, unique
  visitors — auto-refreshed every 8 s when the tab is visible
- Per-row: copy-to-clipboard, active/inactive toggle, analytics shortcut,
  delete with confirmation modal
- "Open as user" and "Open as bot" test buttons (use `?preview=` query)
- Dark glass-morphism Tailwind UI, gradient buttons, smooth transitions
- Loading skeletons, optimistic updates, error banners with retry
- Full TypeScript, ErrorBoundary, accessible modal (Esc/Enter, ARIA)

## Getting started

You need **Node.js 18+** and a **running MongoDB** (any of the options below).

### 1. Get MongoDB running

Pick one — they all work with the same connection string format.

**Option A: Local install** — install
[MongoDB Community Server](https://www.mongodb.com/try/download/community)
for Windows. Start the `MongoDB` service (it runs automatically by default
after install). Connection string: `mongodb://localhost:27017`.

**Option B: Docker** — one command, no install:

```bash
docker run -d --name cloak-mongo -p 27017:27017 -v cloak-mongo-data:/data/db mongo:7
```

Connection string: `mongodb://localhost:27017`.

**Option C: MongoDB Atlas (free cloud tier)** — create a free cluster at
<https://cloud.mongodb.com>, allow your IP, copy the SRV connection string
(`mongodb+srv://...`) into `.env`.

### 2. Configure the app

```bash
cp .env.example .env       # PowerShell: Copy-Item .env.example .env
# then edit .env if you're not using mongodb://localhost:27017
```

### 3. Install & run

```bash
npm run install:all   # installs root + server deps
npm run dev           # starts Vite (port 5173) AND Express (port 4000)
```

Open <http://localhost:5173>. The dashboard talks to the API at
`http://localhost:4000` via the Vite proxy.

The first time the server connects, it will auto-create the `cloak`
database and the required indexes — no migrations needed.

## Scripts

| Script                    | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| `npm run dev`             | Concurrently runs the web dev server and the API server |
| `npm run dev:web`         | Vite dev server only                                    |
| `npm run dev:api`         | Express server only (with `tsx watch`)                  |
| `npm run build`           | Production build of both web and API                    |
| `npm run start`           | Runs the compiled API server (serves built dashboard)   |
| `npm run type-check`      | Strict TypeScript check across both packages            |
| `npm run install:all`     | Install dependencies for root + server                  |

## Production deployment

`npm run build` produces:

- `dist/` — the static dashboard (HTML/CSS/JS)
- `server/dist/` — the compiled Express server

Run `npm start` (which runs `node server/dist/index.js`) and the Express
server will:

1. Serve the API under `/api/*`
2. Serve the redirect handler under `/r/:slug`
3. Serve `dist/` as the SPA for everything else

This means **one process, one port, full server-side cloaking** —
appropriate for deployment behind nginx, Caddy, Cloudflare, etc.

Environment variables:

| Variable               | Default                   | Purpose                                                                  |
| ---------------------- | ------------------------- | ------------------------------------------------------------------------ |
| `MONGODB_URI`          | *(required)*              | MongoDB connection string. Server refuses to start without it.           |
| `MONGODB_DB`           | `cloak`                   | Database name                                                            |
| `PORT`                 | `4000`                    | Port the Express server listens on                                       |
| `HOST`                 | `0.0.0.0`                 | Bind address                                                             |
| `CLOAK_PUBLIC_ORIGIN`  | derived from request      | Override origin used in `cloakedUrl` (useful behind reverse proxies)     |
| `VITE_API_TARGET`      | `http://localhost:4000`   | Used only by the Vite dev proxy                                          |

`.env` is loaded from the project root first, then `server/.env` as a
fallback. Both locations are gitignored.

When deployed behind a reverse proxy, the server already calls
`app.set('trust proxy', true)` so `X-Forwarded-For` / `X-Forwarded-Proto`
headers are honored for accurate IP-based visitor hashing and HTTPS
origin in `cloakedUrl`.

## API reference

```
GET    /api/health                       → { ok: true }
GET    /api/links                        → { links: CloakedLink[] }
POST   /api/links                        → { link: CloakedLink }
       body: { botUrl, userUrl, slug?, campaignName? }
PATCH  /api/links/:id                    → { link: CloakedLink }
       body: { active?, campaignName?, botUrl?, userUrl? }
DELETE /api/links/:id                    → 204
GET    /api/stats                        → DashboardStats
```

Validation is enforced by Zod. Errors come back as:

```json
{ "error": "Slug is already in use." }
```

or, for field-level Zod errors:

```json
{ "error": "Invalid input", "details": { "botUrl": ["Must be a valid URL."] } }
```

## Testing the redirect

After generating a link in the dashboard:

1. Click the slug chip (e.g. `/r/black-friday`) — your real browser UA
   will be detected as **user** → you'll land on `userUrl`.
2. Click the `UserCheck` icon → opens with `?preview=user` (forces user).
3. Click the `Bot` icon → opens with `?preview=bot` (forces bot).
4. Or from a terminal:

   ```bash
   curl -I http://localhost:4000/r/black-friday              # bot (no UA)
   curl -I -A "Googlebot/2.1" http://localhost:4000/r/black-friday  # bot
   curl -I -A "Mozilla/5.0 (Windows NT 10.0)" http://localhost:4000/r/black-friday  # user
   ```

Look at the response headers — `Location` will point to the bot URL or
user URL respectively, and `X-Cloak-Branch` / `X-Cloak-Reason` tell you
what the server decided and why.

## Project structure

```
cloak/
├── package.json                  # root scripts (concurrent dev)
├── vite.config.ts                # SPA + /api & /r proxy
├── tailwind.config.js
├── index.html
├── src/                          # frontend (React + TypeScript)
│   ├── App.tsx
│   ├── main.tsx
│   ├── api.ts                    # typed fetch client
│   ├── types.ts
│   ├── utils.ts
│   ├── hooks/useLinks.ts         # data fetching + mutations + polling
│   └── components/
│       ├── Dashboard.tsx
│       ├── StatsSection.tsx
│       ├── UrlForm.tsx
│       ├── UrlTable.tsx
│       ├── ToggleSwitch.tsx
│       └── ConfirmModal.tsx
└── server/                       # backend
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts              # Express app + static serving
        ├── db.ts                 # SQLite schema + prepared statements
        ├── botDetection.ts       # User-Agent regex + preview overrides
        ├── types.ts
        └── routes/
            ├── api.ts            # /api CRUD + stats
            └── redirect.ts       # /r/:slug 302 + recording
```

## Database schema

The `mongo` database `cloak` contains three collections:

```
links            { _id: <uuid>, campaignName, botUrl, userUrl, slug,
                   active, createdAt, clicks, uniqueVisitors, lastClickAt }
visitors         { linkId, visitorHash, firstSeenAt }
daily_clicks     { _id: "YYYY-MM-DD", count }
```

Indexes (auto-created on startup):

| Collection      | Index                                            | Notes                                  |
| --------------- | ------------------------------------------------ | -------------------------------------- |
| `links`         | `{ slug: 1 }` unique, collation strength 2       | Case-insensitive slug uniqueness       |
| `links`         | `{ createdAt: -1 }`                              | Fast `find().sort({createdAt:-1})`     |
| `visitors`      | `{ linkId: 1, visitorHash: 1 }` unique compound  | Returning-visitor detection via E11000 |

### Why no transactions?

Recording a visit issues three operations — `links.$inc(clicks)`,
`dailyClicks.$inc(count)`, and `visitors.insertOne()` — none of which
depend on the others' return values. A multi-document transaction would
require a replica set (so it wouldn't work against a plain `mongod` or
free-tier setups). Instead each operation is independently atomic, and
the worst case on a partial crash is an under-counted analytic, never an
inconsistent redirect.

If you need stricter guarantees and are running on a replica set or
Atlas, wrap the three operations in `client.startSession()` +
`session.withTransaction(...)` in `routes/redirect.ts`.

## Notes

- All data lives in MongoDB — there are no SQLite files or `localStorage`
  fallbacks anywhere. Drop the `cloak` database (`db.dropDatabase()` in
  the Mongo shell) to wipe everything.
- Click counts and unique visitors update only when a real redirect
  happens through `/r/:slug`.
- For high-traffic deployments behind a CDN, make sure the CDN does **not**
  cache `/r/*` (the server sends `Cache-Control: no-store`, but some CDNs
  still cache by default unless you add an explicit rule).
