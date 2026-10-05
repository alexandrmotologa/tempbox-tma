# API Specification

TempBox provides REST endpoints for mailbox creation, email reading, webhook ingestion, and live test simulations.

## Base URL
All API routes are served under `/api` or `/h`. In local development, the worker runs on `http://localhost:8787`.

---

## 1. Mailbox Endpoints

### Create Mailbox
`POST /api/mailboxes`

Creates a new disposable email address and webhook token.

**Request Body:**
```json
{
  "alias": "my_prefix",
  "domain": "tempbox.dev",
  "ttlSeconds": 7200,
  "telegramUserId": "123456789"
}
```
*All fields are optional. If omitted, a random slug and 2-hour TTL are used.*

**Response (`201 Created`):**
```json
{
  "mailbox": {
    "id": "mb_abc123_4567",
    "address": "my_prefix@tempbox.dev",
    "alias": "my_prefix",
    "domain": "tempbox.dev",
    "token": "a1b2c3d4e5f6...",
    "webhookUrl": "https://tempbox.dev/h/a1b2c3d4e5f6...",
    "createdAt": 1728165600000,
    "expiresAt": 1728172800000,
    "ttlSeconds": 7200,
    "active": true,
    "emailCount": 0,
    "webhookCount": 0
  }
}
```

### Get Mailbox Overview
`GET /api/mailboxes/:id/overview`

Returns mailbox metadata, latest emails, and captured webhooks in a single payload.

**Response (`200 OK`):**
```json
{
  "mailbox": { ... },
  "emails": [
    {
      "id": "msg_xyz",
      "from": { "name": "GitHub", "address": "noreply@github.com" },
      "to": ["my_prefix@tempbox.dev"],
      "subject": "Verification code",
      "extractedOtp": {
        "code": "849201",
        "kind": "numeric",
        "confidence": 0.98,
        "contextSnippet": "...code is 849201..."
      },
      "spf": "pass",
      "dkim": "pass",
      "dmarc": "pass",
      "receivedAt": 1728165700000,
      "isRead": false
    }
  ],
  "webhooks": [
    {
      "id": "wh_abc",
      "method": "POST",
      "path": "/h/token",
      "headers": { "content-type": "application/json" },
      "body": { "event": "order.created" },
      "rawBody": "{\"event\":\"order.created\"}",
      "ip": "1.2.3.4",
      "receivedAt": 1728165720000
    }
  ]
}
```

### Extend Mailbox TTL
`POST /api/mailboxes/:id/extend`

Extends the mailbox lifespan by 1 hour (3600 seconds).

**Response (`200 OK`):**
```json
{
  "success": true,
  "expiresAt": 1728176400000
}
```

### Purge Mailbox
`DELETE /api/mailboxes/:id`

Immediately wipes the mailbox, all associated emails, and all captured webhooks.

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Mailbox and associated records purged successfully"
}
```

---

## 2. Webhook Ingestion

### Ingest Any HTTP Payload
`ALL /h/:token` or `ALL /api/hook/:token`

Accepts any HTTP method (GET, POST, PUT, DELETE, PATCH).

**Query parameters, headers, and request bodies are captured and stored.**

**Response (`200 OK`):**
```json
{
  "success": true,
  "id": "wh_1728165800_abc",
  "message": "Webhook payload recorded",
  "timestamp": 1728165800000
}
```

---

## 3. Test Simulations

### Simulate Inbound Email
`POST /api/simulations/email`

Injects a mock verification email directly into a mailbox for testing.

**Templates:** `github_otp`, `google_security`, `custom_email`

**Request Body:**
```json
{
  "mailboxId": "mb_abc123_4567",
  "template": "github_otp"
}
```

### Simulate Inbound Webhook
`POST /api/simulations/webhook`

Injects a mock webhook payload (such as Stripe `payment_intent.succeeded`).

**Request Body:**
```json
{
  "mailboxId": "mb_abc123_4567",
  "template": "stripe_webhook"
}
```

---

## 4. Maintenance & Expiry

### Purge Expired Records
`POST /api/cron/purge`

Deletes all mailboxes, messages, and webhooks where `expires_at < current_timestamp`.
