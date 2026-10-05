# TempBox TMA

Disposable email and webhook inbox Telegram Mini App and Bot with instant push notifications, automatic verification code (OTP) extraction, and sandboxed rendering.

```
       Incoming Email                  Incoming Webhook
     (MX -> Cloudflare)              (POST /h/:token)
             │                               │
             ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │ Cloudflare MX   │             │   Hono Gateway  │
    │  Email Routing  │             │ (Payload Store) │
    └────────┬────────┘             └────────┬────────┘
             │                               │
             └───────────────┬───────────────┘
                             │
                             ▼
             ┌───────────────────────────────┐
             │       Cloudflare D1 / TTL     │
             └───────────────┬───────────────┘
                             │
              Push Alert     │   Launch Mini App
                             ▼
             ┌───────────────────────────────┐
             │  Telegram Bot & Mini App UI   │
             │  - 1-tap OTP copy pill        │
             │  - Sandboxed email reader     │
             │  - Collapsible JSON inspector │
             └───────────────────────────────┘
```

## Features

- **1-Tap Disposable Inboxes:** Generate random or custom alias email addresses on your domain (e.g. `alex_test@tempbox.dev`).
- **Multi-Mailbox Management:** Keep up to 5 disposable inboxes active simultaneously and switch between them in one tap.
- **Instant Webhook Endpoints:** Unique URLs (`https://tempbox.dev/h/<token>`) that record headers, query parameters, and raw or JSON payloads for any HTTP method.
- **Mock Webhook Responses:** Set custom HTTP response codes (200, 201, 400, 429, 500), simulated latency delays, and mock JSON response bodies.
- **Automatic OTP & Magic Link Detection:** Heuristic engine extracts verification codes (4 to 8 digits) and activation magic links directly from email HTML and text.
- **Instant Search & Filters:** Search by subject, sender, OTP code, path, or payload with filter chips for unread messages, attachments, or code-only emails.
- **QR Code Sharing:** Generate crisp QR codes for your email address or webhook endpoint to test across mobile devices.
- **Data Export & Raw Email:** Download complete messages as standard RFC 822 `.eml` files or export all captured webhooks to JSON.
- **Telegram Push Notifications:** Real-time Telegram messages when emails or webhooks arrive, complete with direct verification codes and Mini App deep links.
- **Sandboxed Email Reader:** HTML rendering takes place inside an isolated iframe with `sandbox="allow-popups"` (scripts disabled) to protect against tracking scripts and redirects.
- **Tactile Audio & Haptics:** Zero-dependency Web Audio chimes for new arrivals and clipboard copies with Telegram haptic feedback.
- **Configurable Lifespan & Auto-Purge:** Inboxes expire after 2 hours by default. Users can extend by 1 hour, trigger an immediate purge, or enable zero-trace exit on close.
- **Built-in Test Lab:** One-click simulation for GitHub OTP emails, Supabase magic links, Google security alerts, and Stripe webhook events.

## Monorepo Layout

```
tempbox-tma/
├── apps/
│   ├── web/          # React 19 + Tailwind CSS Telegram Mini App
│   ├── worker/       # Hono + Cloudflare Worker ingestion backend
│   └── bot/          # Standalone Telegram Bot handler
├── packages/
│   └── shared-types/ # Shared TypeScript types and API contracts
└── docs/             # Technical specifications and deployment guides
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Local Development Server

Start the worker backend (runs on `http://localhost:8787`):

```bash
npm --workspace=apps/worker run dev
```

In a second terminal, start the Telegram Mini App frontend (runs on `http://localhost:5173`):

```bash
npm --workspace=apps/web run dev
```

Open `http://localhost:5173` in your browser. You can immediately generate addresses, simulate test emails in the Test Lab tab, and copy verification codes.

### 3. Run Test Suite

```bash
npm run test
```

Runs the 10 worker tests (covering OTP heuristics and REST endpoints) and bot unit tests.

### 4. Build for Production

```bash
npm run build
```

## Deployment

Refer to the documentation files in `docs/`:

- [docs/architecture.md](docs/architecture.md): System architecture and data flow.
- [docs/api-spec.md](docs/api-spec.md): Complete REST endpoint reference.
- [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md): Cloudflare Email Routing and D1 setup.
- [docs/telegram-mini-app-integration.md](docs/telegram-mini-app-integration.md): Telegram BotFather setup and WebApp integration.
- [docs/otp-extraction-heuristics.md](docs/otp-extraction-heuristics.md): OTP detection heuristics and test cases.

## License

MIT
