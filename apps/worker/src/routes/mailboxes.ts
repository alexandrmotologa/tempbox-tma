import { Hono } from 'hono';
import type { D1DatabaseCompat } from '../db/database.js';
import type { Mailbox, CreateMailboxRequest, EmailMessage, WebhookRequest } from '@tempbox/shared-types';

interface Env {
  DB: D1DatabaseCompat;
  DEFAULT_DOMAIN?: string;
  DEFAULT_TTL_MINUTES?: string | number;
  BASE_URL?: string;
}

export const mailboxRouter = new Hono<{ Bindings: Env }>();

// Helper to generate random alphanumeric slug
function generateSlug(length = 7): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

// Helper to generate secure hex token
function generateToken(): string {
  const chars = '0123456789abcdef';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// POST /api/mailboxes - Create a new disposable mailbox
mailboxRouter.post('/', async (c) => {
  const db = c.env.DB;
  const defaultDomain = c.env.DEFAULT_DOMAIN || 'tempbox.dev';
  const defaultTtlMinutes = Number(c.env.DEFAULT_TTL_MINUTES || 120);

  let body: CreateMailboxRequest = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const alias = (body.alias?.trim().toLowerCase() || generateSlug(8)).replace(/[^a-z0-9_-]/g, '');
  const domain = body.domain?.trim().toLowerCase() || defaultDomain;
  const address = `${alias}@${domain}`;
  const id = `mb_${alias}_${generateSlug(4)}`;
  const token = generateToken();
  const ttlSeconds = body.ttlSeconds || defaultTtlMinutes * 60;
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;
  const baseUrl = c.env.BASE_URL || new URL(c.req.url).origin;
  const webhookUrl = `${baseUrl}/h/${token}`;

  // Check if alias is taken
  const existing = await db.prepare('SELECT id FROM mailboxes WHERE address = ?').bind(address).first();
  if (existing) {
    return c.json({ error: 'Mailbox address already taken. Please choose another alias.' }, 409);
  }

  await db
    .prepare(
      `INSERT INTO mailboxes (
        id, address, alias, domain, token, webhook_url, telegram_user_id, created_at, expires_at, ttl_seconds, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .bind(
      id,
      address,
      alias,
      domain,
      token,
      webhookUrl,
      body.telegramUserId ? String(body.telegramUserId) : null,
      now,
      expiresAt,
      ttlSeconds
    )
    .run();

  const mailbox: Mailbox = {
    id,
    address,
    alias,
    domain,
    token,
    webhookUrl,
    createdAt: now,
    expiresAt,
    ttlSeconds,
    telegramUserId: body.telegramUserId,
    active: true,
    emailCount: 0,
    webhookCount: 0
  };

  return c.json({ mailbox }, 201);
});

// GET /api/mailboxes/:id - Get mailbox details
mailboxRouter.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const row = await db.prepare('SELECT * FROM mailboxes WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!row) {
    return c.json({ error: 'Mailbox not found' }, 404);
  }

  const emailCountRow = await db
    .prepare('SELECT COUNT(*) as count FROM email_messages WHERE mailbox_id = ?')
    .bind(id)
    .first<{ count: number }>();

  const webhookCountRow = await db
    .prepare('SELECT COUNT(*) as count FROM webhook_requests WHERE mailbox_id = ?')
    .bind(id)
    .first<{ count: number }>();

  const mailbox: Mailbox = {
    id: String(row.id),
    address: String(row.address),
    alias: String(row.alias),
    domain: String(row.domain),
    token: String(row.token),
    webhookUrl: String(row.webhook_url),
    telegramUserId: row.telegram_user_id ? String(row.telegram_user_id) : undefined,
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
    ttlSeconds: Number(row.ttl_seconds),
    active: Boolean(row.active),
    emailCount: emailCountRow?.count ?? 0,
    webhookCount: webhookCountRow?.count ?? 0
  };

  return c.json({ mailbox });
});

// GET /api/mailboxes/:id/overview - Get mailbox + messages + webhooks in one fast call
mailboxRouter.get('/:id/overview', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const row = await db.prepare('SELECT * FROM mailboxes WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!row) {
    return c.json({ error: 'Mailbox not found' }, 404);
  }

  const emailRows = await db
    .prepare('SELECT * FROM email_messages WHERE mailbox_id = ? ORDER BY received_at DESC LIMIT 50')
    .bind(id)
    .all<Record<string, unknown>>();

  const webhookRows = await db
    .prepare('SELECT * FROM webhook_requests WHERE mailbox_id = ? ORDER BY received_at DESC LIMIT 50')
    .bind(id)
    .all<Record<string, unknown>>();

  const emails: EmailMessage[] = (emailRows.results || []).map((e) => ({
    id: String(e.id),
    mailboxId: String(e.mailbox_id),
    from: {
      name: e.from_name ? String(e.from_name) : undefined,
      address: String(e.from_address)
    },
    to: JSON.parse(String(e.to_addresses || '[]')),
    subject: String(e.subject),
    text: e.text_content ? String(e.text_content) : undefined,
    html: e.html_content ? String(e.html_content) : undefined,
    headers: JSON.parse(String(e.headers_json || '{}')),
    spf: e.spf as EmailMessage['spf'],
    dkim: e.dkim as EmailMessage['dkim'],
    dmarc: e.dmarc as EmailMessage['dmarc'],
    attachments: JSON.parse(String(e.attachments_json || '[]')),
    extractedOtp: e.otp_code
      ? {
          code: String(e.otp_code),
          kind: (e.otp_kind as 'numeric' | 'alphanumeric') || 'numeric',
          confidence: Number(e.otp_confidence || 0.9),
          contextSnippet: e.otp_snippet ? String(e.otp_snippet) : undefined
        }
      : undefined,
    receivedAt: Number(e.received_at),
    expiresAt: Number(e.expires_at),
    isRead: Boolean(e.is_read)
  }));

  const webhooks: WebhookRequest[] = (webhookRows.results || []).map((w) => ({
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

  const mailbox: Mailbox = {
    id: String(row.id),
    address: String(row.address),
    alias: String(row.alias),
    domain: String(row.domain),
    token: String(row.token),
    webhookUrl: String(row.webhook_url),
    telegramUserId: row.telegram_user_id ? String(row.telegram_user_id) : undefined,
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
    ttlSeconds: Number(row.ttl_seconds),
    active: Boolean(row.active),
    emailCount: emails.length,
    webhookCount: webhooks.length
  };

  return c.json({ mailbox, emails, webhooks });
});

// POST /api/mailboxes/:id/extend - Extend mailbox TTL
mailboxRouter.post('/:id/extend', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const additionalSeconds = 3600; // 1 hour

  const row = await db.prepare('SELECT expires_at FROM mailboxes WHERE id = ?').bind(id).first<{ expires_at: number }>();
  if (!row) {
    return c.json({ error: 'Mailbox not found' }, 404);
  }

  const newExpiresAt = Math.max(Date.now(), Number(row.expires_at)) + additionalSeconds * 1000;
  await db.prepare('UPDATE mailboxes SET expires_at = ? WHERE id = ?').bind(newExpiresAt, id).run();

  return c.json({ success: true, expiresAt: newExpiresAt });
});

// DELETE /api/mailboxes/:id - Purge mailbox immediately
mailboxRouter.delete('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  await db.prepare('DELETE FROM mailboxes WHERE id = ?').bind(id).run();
  return c.json({ success: true, message: 'Mailbox and associated records purged successfully' });
});
