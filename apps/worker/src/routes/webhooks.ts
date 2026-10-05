import { Hono } from 'hono';
import type { D1DatabaseCompat } from '../db/database.js';
import type { WebhookRequest } from '@tempbox/shared-types';
import { sendTelegramPushNotification } from '../services/telegram_notifier.js';

interface Env {
  DB: D1DatabaseCompat;
  TELEGRAM_BOT_TOKEN?: string;
  MINI_APP_URL?: string;
}

export const webhookRouter = new Hono<{ Bindings: Env }>();

function generateId(): string {
  return 'wh_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

// Ingestion Handler for ANY HTTP request on /h/:token or /api/hook/:token
export async function handleIncomingWebhook(c: any) {
  const db: D1DatabaseCompat = c.env.DB;
  const token = c.req.param('token');

  // Select mailbox with response config
  const mailbox = await db
    .prepare('SELECT id, address, expires_at, telegram_user_id, response_config_json FROM mailboxes WHERE token = ? AND active = 1')
    .bind(token)
    .first<{ id: string; address: string; expires_at: number; telegram_user_id?: string; response_config_json?: string }>();

  if (!mailbox) {
    return c.json({ error: 'Invalid or expired webhook token' }, 404);
  }

  const req = c.req;
  const method = req.method.toUpperCase();
  const url = req.url;
  const path = new URL(url).pathname;

  // Extract query parameters
  const queryParams: Record<string, string> = {};
  const query = req.query();
  for (const [k, v] of Object.entries(query)) {
    queryParams[k] = String(v);
  }

  // Extract headers
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.header())) {
    headers[k.toLowerCase()] = String(v);
  }

  // Extract body
  let rawBody = '';
  let bodyJson: unknown = null;
  try {
    rawBody = await req.text();
    if (rawBody.trim().startsWith('{') || rawBody.trim().startsWith('[')) {
      bodyJson = JSON.parse(rawBody);
    }
  } catch {
    rawBody = '';
  }

  const id = generateId();
  const now = Date.now();
  const expiresAt = Number(mailbox.expires_at) || now + 3600 * 1000;
  const ip = req.header('cf-connecting-ip') || req.header('x-forwarded-for') || '127.0.0.1';

  await db
    .prepare(
      `INSERT INTO webhook_requests (
        id, mailbox_id, method, path, url, query_params_json, headers_json, body_json, raw_body, ip_address, received_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      mailbox.id,
      method,
      path,
      url,
      JSON.stringify(queryParams),
      JSON.stringify(headers),
      bodyJson ? JSON.stringify(bodyJson) : null,
      rawBody,
      ip,
      now,
      expiresAt
    )
    .run();

  // Telegram push notification if mailbox owner is connected
  if (mailbox.telegram_user_id) {
    const preview = rawBody || JSON.stringify(queryParams);
    await sendTelegramPushNotification(
      {
        telegramUserId: mailbox.telegram_user_id,
        type: 'webhook',
        mailboxAddress: mailbox.address,
        subject: `${method} ${path}`,
        previewText: preview,
        messageId: id,
        deepLinkUrl: `${c.env.MINI_APP_URL || 'https://t.me/tempbox_bot/app'}?webhook=${id}`
      },
      {
        botToken: c.env.TELEGRAM_BOT_TOKEN,
        miniAppUrl: c.env.MINI_APP_URL
      }
    );
  }

  let responseConfig = {
    statusCode: 200,
    contentType: 'application/json',
    responseBody: JSON.stringify({
      success: true,
      id,
      message: 'Webhook payload recorded',
      timestamp: now
    }),
    delayMs: 0
  };

  if (mailbox.response_config_json) {
    try {
      const parsed = JSON.parse(mailbox.response_config_json);
      if (parsed.statusCode) responseConfig.statusCode = Number(parsed.statusCode);
      if (parsed.contentType) responseConfig.contentType = parsed.contentType;
      if (parsed.responseBody) responseConfig.responseBody = parsed.responseBody;
      if (parsed.delayMs) responseConfig.delayMs = Number(parsed.delayMs);
    } catch {
      // ignore JSON parse error
    }
  }

  if (responseConfig.delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, responseConfig.delayMs));
  }

  c.header('Content-Type', responseConfig.contentType);
  c.status(responseConfig.statusCode);
  return c.body(responseConfig.responseBody);
}

// GET /api/mailboxes/:id/webhooks
webhookRouter.get('/mailboxes/:id/webhooks', async (c) => {
  const db = c.env.DB;
  const mailboxId = c.req.param('id');

  const rows = await db
    .prepare('SELECT * FROM webhook_requests WHERE mailbox_id = ? ORDER BY received_at DESC')
    .bind(mailboxId)
    .all<Record<string, unknown>>();

  const webhooks: WebhookRequest[] = (rows.results || []).map((w) => ({
    id: String(w.id),
    mailboxId: String(w.mailbox_id),
    method: String(w.method),
    path: String(w.path),
    url: String(w.url),
    queryParams: JSON.parse(String(w.query_params_json || '{}')),
    headers: JSON.parse(String(w.headers_json || '{}')),
    body: w.body_json ? JSON.parse(String(w.body_json)) : null,
    rawBody: String(w.raw_body || ''),
    ip: String(w.ip_address || ''),
    receivedAt: Number(w.received_at),
    expiresAt: Number(w.expires_at)
  }));

  return c.json({ webhooks });
});

// GET /api/mailboxes/:id/webhooks/:webhookId
webhookRouter.get('/mailboxes/:id/webhooks/:webhookId', async (c) => {
  const db = c.env.DB;
  const mailboxId = c.req.param('id');
  const webhookId = c.req.param('webhookId');

  const row = await db
    .prepare('SELECT * FROM webhook_requests WHERE id = ? AND mailbox_id = ?')
    .bind(webhookId, mailboxId)
    .first<Record<string, unknown>>();

  if (!row) {
    return c.json({ error: 'Webhook request not found' }, 404);
  }

  const webhook: WebhookRequest = {
    id: String(row.id),
    mailboxId: String(row.mailbox_id),
    method: String(row.method),
    path: String(row.path),
    url: String(row.url),
    queryParams: JSON.parse(String(row.query_params_json || '{}')),
    headers: JSON.parse(String(row.headers_json || '{}')),
    body: row.body_json ? JSON.parse(String(row.body_json)) : null,
    rawBody: String(row.raw_body || ''),
    ip: String(row.ip_address || ''),
    receivedAt: Number(row.received_at),
    expiresAt: Number(row.expires_at)
  };

  return c.json({ webhook });
});

// DELETE /api/mailboxes/:id/webhooks/:webhookId
webhookRouter.delete('/mailboxes/:id/webhooks/:webhookId', async (c) => {
  const db = c.env.DB;
  const mailboxId = c.req.param('id');
  const webhookId = c.req.param('webhookId');

  await db.prepare('DELETE FROM webhook_requests WHERE id = ? AND mailbox_id = ?').bind(webhookId, mailboxId).run();
  return c.json({ success: true });
});
