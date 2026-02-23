# Spidey 🕷️

A minimal website monitoring tool. Give it a URL, tell it how often to check, and it'll notify you the moment something changes or a keyword appears — perfect for snagging football match tickets the moment they go live.

---

## Use Case

You want to book football tickets that can go on sale at any moment. Spidey watches the ticket page for you and fires a notification the instant anything changes, so you can jump in and buy before they sell out.

---

## Features

- **URL monitoring** — add any website and configure check frequency (every N minutes)
- **Change detection** — detects any change in the page's visible content via SHA-256 hash comparison
- **Keyword detection** — alert when specific words appear (e.g. "available", "buy now", "book")
- **Configurable** — edit frequency, keywords, and notification channels at any time
- **Multi-channel notifications**:
  - Desktop (macOS native) — instant, no setup
  - Email (via SMTP / Gmail)
  - Telegram (Bot API)
  - Slack (Incoming Webhook)
  - Discord (Webhook)
- **Check history** — view all past checks, see when content changed and which keywords matched

---

## Architecture

Monorepo with Bun workspaces:

```
spidey/
├── apps/
│   ├── web/       # React + Vite frontend (port 5173)
│   └── server/    # Bun + Elysia backend (port 3000)
└── packages/
    └── shared/    # TypeScript types shared between web and server
```

### Tech Stack

| Layer | Choice |
|---|---|
| Runtime / package manager | Bun |
| Backend | Elysia (Bun-native HTTP framework) |
| Database | PostgreSQL (via Drizzle ORM) |
| Scheduler | node-cron |
| HTML parsing | cheerio + fetch |
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| Data fetching | TanStack Query |

### Why PostgreSQL?

The app is designed to run in a Kubernetes cluster. PostgreSQL is stateless from the app's perspective — connect via `DATABASE_URL` env var. Use **Neon** or **Supabase** free tier for a managed DB with zero ops overhead, or run a StatefulSet in your cluster.

---

## Database Schema

Three tables:

- **`monitors`** — a URL to watch, with interval, keywords, check mode, and last known content hash
- **`notification_channels`** — one row per notification method per monitor (e.g. monitor 1 → Telegram + Email)
- **`check_logs`** — every check result: timestamp, whether content changed, keywords matched, errors

---

## Notification Channels

| Channel | Setup required | Works on K8s |
|---|---|---|
| Desktop (macOS) | None | No (local dev only) |
| Email | SMTP credentials (Gmail app password works) | Yes |
| Telegram | Create a bot via @BotFather, get chat_id | Yes |
| Slack | Create an Incoming Webhook in your workspace | Yes |
| Discord | Create a Webhook in a channel | Yes |

Desktop notifications are skipped automatically when `SPIDEY_ENV=production`.

---

## API

```
GET    /api/monitors                     List all monitors
POST   /api/monitors                     Create a monitor
GET    /api/monitors/:id                 Get a monitor
PUT    /api/monitors/:id                 Update a monitor
DELETE /api/monitors/:id                 Delete a monitor
POST   /api/monitors/:id/trigger         Manually trigger a check
GET    /api/monitors/:id/logs            Check history (paginated)
POST   /api/monitors/:id/channels        Add a notification channel
PUT    /api/monitors/:id/channels/:cid   Update a channel
DELETE /api/monitors/:id/channels/:cid   Remove a channel
```

---

## Running Locally

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- PostgreSQL running locally (`docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`)

### Setup

```bash
# Clone and install
cd spidey
bun install

# Set environment variables
cp apps/server/.env.example apps/server/.env
# Edit .env: set DATABASE_URL and any notification credentials

# Run DB migrations
cd apps/server && bun run db:migrate

# Start both apps (from root)
bun run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

---

## Kubernetes Deployment

1. Build Docker images for `apps/server` and `apps/web`
2. Create a `DATABASE_URL` secret in your cluster pointing to your managed PostgreSQL
3. Deploy `server` as a `Deployment` with the env secret mounted
4. Serve the built frontend as a static `Deployment` (Nginx) or bundle it into the server
5. Run DB migrations as an init container or Job before the server starts

---

## TODO

### Phase 1 — Core Backend
- [x] Monorepo setup (Bun workspaces, shared types)
- [x] Database schema + Drizzle migrations
- [x] Scraper: fetch + cheerio + SHA-256 hash
- [x] Notifiers: desktop, email, Telegram, Slack, Discord
- [x] Scheduler: node-cron per monitor, dynamic add/remove/restart
- [x] REST API: monitors CRUD, channels CRUD, manual trigger, check logs

### Phase 2 — Frontend
- [x] Vite + React + Tailwind scaffold
- [x] Dashboard: monitor list with live status
- [x] Add/Edit monitor form (URL, interval, keywords, check mode)
- [x] Notification channel config UI (per channel type)
- [x] Check history page

### Phase 3 — Polish & Deploy
- [ ] Dockerfiles for server and web
- [ ] Docker Compose for local dev (includes PostgreSQL)
- [ ] Kubernetes manifests (Deployment, Service, Secret, optional Ingress)
- [ ] README with setup instructions
