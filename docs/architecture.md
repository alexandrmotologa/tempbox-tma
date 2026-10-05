# System Architecture

TempBox is a disposable email and webhook hub built specifically for Telegram. It combines Cloudflare Email Routing, an edge ingestion worker, and a React 19 Telegram Mini App.

```
Incoming Email                  Incoming Webhook
(MX Cloudflare)                 (HTTP POST /h/:token)
       │                                │
       ▼                                ▼
┌──────────────────────────────────────────────┐
│        Cloudflare Worker (Hono Engine)       │
│ - MIME Parser (postal-mime)                  │
│ - OTP & Verification Heuristic Engine        │
│ - Dynamic HTTP Body & Header Inspector       │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│           Storage Layer (Cloudflare D1)      │
│ - Mailboxes, messages, webhooks              │
│ - Expiration timestamps (TTL)                │
└──────────────────────┬───────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│ Telegram Bot API │        │ Telegram MiniApp │
│ - Push alerts    │        │ - Sandboxed HTML │
│ - 1-tap OTP copy │        │ - JSON inspector │
└──────────────────┘        └──────────────────┘
```

## Core Components

### 1. Ingestion Worker (`apps/worker`)
The ingestion worker runs on Cloudflare Workers and handles both HTTP requests and raw email streams.

- **Email Pipeline:** Cloudflare Email Routing captures incoming MX traffic for configured domains (such as `tempbox.dev`). The worker receives raw MIME streams, extracts sender metadata, parses plaintext and HTML representations, runs OTP detection, and saves the message into Cloudflare D1.
- **Webhook Pipeline:** Endpoints mounted at `/h/:token` capture incoming HTTP calls regardless of method (GET, POST, PUT, DELETE, PATCH). It stores headers, query strings, and payloads (JSON or raw text) for inspection.
- **Push Dispatcher:** If a mailbox is linked to a Telegram user ID, the worker formats an alert with the sender, subject, and any detected verification code, dispatching it through the Telegram Bot API.

### 2. Mini App Frontend (`apps/web`)
The web application runs inside the Telegram WebApp container.

- **Theme Synchronization:** Adopts colors defined by Telegram CSS variables (`--tg-theme-bg-color`, `--tg-theme-text-color`).
- **Sandboxed Email Reader:** HTML emails are rendered in an isolated iframe with `sandbox="allow-popups"` to prevent script execution, tracking scripts, and unauthorized redirects.
- **1-Tap OTP Extraction:** Verification codes appear in highlighted pills with direct clipboard copy buttons that trigger haptic feedback.
- **Request Inspector:** Formats captured webhooks with collapsible JSON payloads and provides a one-click cURL export command.

### 3. Telegram Bot (`apps/bot`)
The Telegram bot acts as the communication gateway for users on mobile and desktop Telegram clients.

- Generates new disposable mailboxes on `/new`.
- Launches the Mini App with deep-linking to specific emails or webhooks.
- Dispatches instant alerts when messages arrive.

## Storage and Lifespan Model

Every mailbox, email, and webhook has an explicit Unix timestamp (`expires_at`).

1. Default lifespan is 2 hours. Users can extend it in 1-hour increments up to 24 hours.
2. A scheduled Cloudflare cron trigger runs periodically to execute `DELETE FROM mailboxes WHERE expires_at < ?`.
3. Users can trigger immediate mailbox deletion via the Purge action, wiping all records and related messages immediately.
