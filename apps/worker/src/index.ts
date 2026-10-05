import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { D1DatabaseCompat } from './db/database.js';
import { MemoryD1Database } from './db/database.js';
import { mailboxRouter } from './routes/mailboxes.js';
import { messageRouter } from './routes/messages.js';
import { webhookRouter, handleIncomingWebhook } from './routes/webhooks.js';
import { simulationRouter } from './routes/simulations.js';
import { telegramRouter } from './routes/telegram.js';
import { parseRawEmail } from './services/email_parser.js';
import { extractOtp } from './services/otp_extractor.js';
import { extractMagicLink } from './services/magic_link_extractor.js';
import { sendTelegramPushNotification } from './services/telegram_notifier.js';
import { purgeExpiredRecords } from './services/ttl_manager.js';

export interface Env {
  DB: D1DatabaseCompat;
  TELEGRAM_BOT_TOKEN?: string;
  MINI_APP_URL?: string;
  DEFAULT_DOMAIN?: string;
  DEFAULT_TTL_MINUTES?: string | number;
  BASE_URL?: string;
}

export const app = new Hono<{ Bindings: Env }>();

// Global in-memory fallback for local dev & testing
const fallbackDb = new MemoryD1Database();

// Middleware: ensure DB exists on context
app.use('*', async (c, next) => {
  if (!c.env) {
    c.env = { DB: fallbackDb };
  } else if (!c.env.DB) {
    c.env.DB = fallbackDb;
  }
  await next();
});

// Middleware: CORS
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['Content-Length', 'X-Total-Count'],
    maxAge: 86400
  })
);

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'tempbox-worker',
    timestamp: Date.now()
  });
});

// Mount modular sub-routers
app.route('/api/mailboxes', mailboxRouter);
app.route('/api/mailboxes/:id/messages', messageRouter);
app.route('/api', webhookRouter);
app.route('/api/simulations', simulationRouter);
app.route('/api/telegram', telegramRouter);

// Direct Webhook Catchers
app.all('/h/:token', handleIncomingWebhook);
app.all('/api/hook/:token', handleIncomingWebhook);

// Manual or Cron TTL purge trigger
app.post('/api/cron/purge', async (c) => {
  const result = await purgeExpiredRecords(c.env.DB);
  return c.json({ success: true, result });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Endpoint not found', path: c.req.path }, 404);
});

// Cloudflare Email Routing Handler
export async function handleCloudflareEmail(message: any, env: Env) {
  const db = env.DB || fallbackDb;
  const rawStream = message.raw;
  const toAddress = (message.to || '').toLowerCase().trim();

  // Find matching mailbox
  const mailbox = await db
    .prepare('SELECT id, address, expires_at, telegram_user_id FROM mailboxes WHERE address = ? AND active = 1')
    .bind(toAddress)
    .first<{ id: string; address: string; expires_at: number; telegram_user_id?: string }>();

  if (!mailbox) {
    console.log(`[EmailWorker] Dropping email to unregistered or expired address: ${toAddress}`);
    return;
  }

  // Parse raw email
  const parsed = await parseRawEmail(rawStream);
  const id = 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const now = Date.now();
  const expiresAt = Number(mailbox.expires_at) || now + 3600 * 1000;

  // Extract OTP & Magic Link
  const extractedOtp = extractOtp(parsed.text || parsed.html, parsed.subject);
  const extractedMagicLink = extractMagicLink(parsed.html, parsed.text);

  // Insert into DB
  await db
    .prepare(
      `INSERT INTO email_messages (
        id, mailbox_id, from_name, from_address, to_addresses, subject, text_content, html_content,
        headers_json, spf, dkim, dmarc, attachments_json, otp_code, otp_kind, otp_confidence, otp_snippet,
        magic_link_url, magic_link_label, magic_link_domain, received_at, expires_at, is_read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .bind(
      id,
      mailbox.id,
      parsed.from.name || null,
      parsed.from.address,
      JSON.stringify(parsed.to),
      parsed.subject,
      parsed.text || null,
      parsed.html || null,
      JSON.stringify(parsed.headers),
      parsed.spf || null,
      parsed.dkim || null,
      parsed.dmarc || null,
      JSON.stringify(parsed.attachments),
      extractedOtp?.code || null,
      extractedOtp?.kind || null,
      extractedOtp?.confidence || null,
      extractedOtp?.contextSnippet || null,
      extractedMagicLink?.url || null,
      extractedMagicLink?.label || null,
      extractedMagicLink?.domain || null,
      now,
      expiresAt
    )
    .run();

  // Send push notification to Telegram
  if (mailbox.telegram_user_id) {
    await sendTelegramPushNotification(
      {
        telegramUserId: mailbox.telegram_user_id,
        type: 'email',
        mailboxAddress: mailbox.address,
        subject: parsed.subject,
        sender: parsed.from.name ? `${parsed.from.name} <${parsed.from.address}>` : parsed.from.address,
        otpCode: extractedOtp?.code,
        previewText: parsed.text || parsed.subject,
        messageId: id,
        deepLinkUrl: `${env.MINI_APP_URL || 'https://t.me/tempbox_bot/app'}?email=${id}`
      },
      {
        botToken: env.TELEGRAM_BOT_TOKEN,
        miniAppUrl: env.MINI_APP_URL
      }
    );
  }
}

// Default export for Cloudflare Workers
export default {
  fetch: app.fetch,
  email: handleCloudflareEmail,
  async scheduled(_event: any, env: Env) {
    const db = env.DB || fallbackDb;
    const purged = await purgeExpiredRecords(db);
    console.log('[Cron] Expired records purge complete:', purged);
  }
};
