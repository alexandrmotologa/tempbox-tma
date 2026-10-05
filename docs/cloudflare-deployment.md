# Cloudflare Deployment Guide

This guide walks through configuring Cloudflare Email Routing, Cloudflare D1 database, and deploying the TempBox ingestion worker.

## Prerequisites

1. A Cloudflare account with a domain configured (such as `tempbox.dev`).
2. Node.js 20+ installed.
3. Wrangler CLI logged in via `npx wrangler login`.

---

## 1. Cloudflare D1 Database Provisioning

Create the production D1 database:

```bash
cd apps/worker
npx wrangler d1 create tempbox-d1
```

Copy the returned `database_id` into `apps/worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "tempbox-d1"
database_id = "your-database-id-here"
```

Initialize the database schema:

```bash
npx wrangler d1 execute tempbox-d1 --file=./src/db/schema.sql
```

---

## 2. Cloudflare Email Routing Setup

1. In the Cloudflare dashboard, navigate to your domain and select **Email Routing**.
2. Complete DNS verification (Cloudflare will automatically insert the necessary MX and TXT SPF records).
3. Under **Routing Rules**, create a Catch-All rule:
   - Action: **Send to Worker**
   - Destination Worker: **tempbox-worker**

Every incoming email to `*@tempbox.dev` is now passed directly into `handleCloudflareEmail` in `apps/worker/src/index.ts`.

---

## 3. Environment Variables & Secrets

Configure your Telegram Bot token and Mini App URL:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
# Paste your Bot token from @BotFather
```

In `wrangler.toml`, adjust default domain and TTL settings as needed:

```toml
[vars]
DEFAULT_DOMAIN = "tempbox.dev"
MINI_APP_URL = "https://t.me/tempbox_bot/app"
DEFAULT_TTL_MINUTES = 120
```

---

## 4. Deploying the Worker

Deploy the worker to the Cloudflare edge:

```bash
npm --workspace=apps/worker run deploy
```

---

## 5. Hosting the Telegram Mini App Frontend

The frontend in `apps/web` can be hosted on Cloudflare Pages, Vercel, or any static hosting provider.

Build the frontend:

```bash
npm --workspace=apps/web run build
```

The resulting assets in `apps/web/dist` can be deployed via Wrangler Pages:

```bash
npx wrangler pages deploy apps/web/dist --project-name=tempbox-web
```
