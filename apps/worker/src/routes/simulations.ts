import { Hono } from 'hono';
import type { D1DatabaseCompat } from '../db/database.js';
import type { EmailMessage, SimulationPayload } from '@tempbox/shared-types';
import { extractOtp } from '../services/otp_extractor.js';
import { sendTelegramPushNotification } from '../services/telegram_notifier.js';

interface Env {
  DB: D1DatabaseCompat;
  TELEGRAM_BOT_TOKEN?: string;
  MINI_APP_URL?: string;
}

export const simulationRouter = new Hono<{ Bindings: Env }>();

function generateId(prefix = 'msg'): string {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

// POST /api/simulations/email - Ingest a mock verification email
simulationRouter.post('/email', async (c) => {
  const db = c.env.DB;
  const body: SimulationPayload = await c.req.json();
  const mailboxId = body.mailboxId;

  const mailbox = await db
    .prepare('SELECT id, address, expires_at, telegram_user_id FROM mailboxes WHERE id = ?')
    .bind(mailboxId)
    .first<{ id: string; address: string; expires_at: number; telegram_user_id?: string }>();

  if (!mailbox) {
    return c.json({ error: 'Mailbox not found' }, 404);
  }

  const id = generateId('msg');
  const now = Date.now();
  const expiresAt = Number(mailbox.expires_at) || now + 3600 * 1000;

  let fromName = 'GitHub Security';
  let fromAddress = 'support@github.com';
  let subject = 'Your GitHub authentication code is 849201';
  let text = 'Hey there,\n\nHere is your verification code: 849201\n\nThis code will expire in 10 minutes.\n\nGitHub Support Team';
  let html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e1e4e8; border-radius: 8px;">
      <h2 style="color: #24292e; margin-bottom: 16px;">GitHub Authentication</h2>
      <p style="color: #586069; font-size: 15px; line-height: 1.5;">Please use the verification code below to complete your login verification:</p>
      <div style="background-color: #f6f8fa; border: 1px dashed #d1d5da; border-radius: 6px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0366d6;">849201</span>
      </div>
      <p style="color: #586069; font-size: 13px;">If you did not make this request, you can safely ignore this email.</p>
    </div>
  `;

  if (body.template === 'google_security') {
    fromName = 'Google';
    fromAddress = 'no-reply@accounts.google.com';
    subject = 'G-492019 is your Google verification code';
    text = 'Google Verification Code: G-492019\n\nUse this code to verify your identity. Don\'t share it with anyone.';
    html = `
      <div style="font-family: Roboto, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 20px; border-radius: 8px; border: 1px solid #dadce0;">
        <h3 style="color: #202124;">Google Account Verification</h3>
        <p style="color: #3c4043; font-size: 14px;">G-492019 is your Google verification code.</p>
        <div style="margin: 20px 0; font-size: 28px; font-weight: 600; letter-spacing: 4px; color: #1a73e8;">G-492019</div>
        <p style="color: #5f6368; font-size: 12px;">Google will never ask you for this code.</p>
      </div>
    `;
  } else if (body.template === 'custom_email' && body.customData) {
    fromName = body.customData.from || 'Custom Service';
    fromAddress = `${fromName.toLowerCase().replace(/\s+/g, '')}@example.com`;
    subject = body.customData.subject || 'Your verification passcode';
    const code = body.customData.code || '592814';
    text = body.customData.body || `Your one-time passcode is ${code}. Please enter it to verify.`;
    html = `<div style="font-family: sans-serif; padding: 20px;"><h3>Verification Notice</h3><p>${text}</p><h1 style="font-family: monospace; color: #2563eb;">${code}</h1></div>`;
  }

  // Extract OTP
  const extractedOtp = extractOtp(text, subject);

  await db
    .prepare(
      `INSERT INTO email_messages (
        id, mailbox_id, from_name, from_address, to_addresses, subject, text_content, html_content,
        headers_json, spf, dkim, dmarc, attachments_json, otp_code, otp_kind, otp_confidence, otp_snippet,
        received_at, expires_at, is_read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .bind(
      id,
      mailbox.id,
      fromName,
      fromAddress,
      JSON.stringify([mailbox.address]),
      subject,
      text,
      html,
      JSON.stringify({
        from: `"${fromName}" <${fromAddress}>`,
        to: mailbox.address,
        subject,
        'authentication-results': 'spf=pass dkim=pass dmarc=pass'
      }),
      'pass',
      'pass',
      'pass',
      JSON.stringify([]),
      extractedOtp?.code || null,
      extractedOtp?.kind || null,
      extractedOtp?.confidence || null,
      extractedOtp?.contextSnippet || null,
      now,
      expiresAt
    )
    .run();

  // Send push notification if telegram connected
  if (mailbox.telegram_user_id) {
    await sendTelegramPushNotification(
      {
        telegramUserId: mailbox.telegram_user_id,
        type: 'email',
        mailboxAddress: mailbox.address,
        subject,
        sender: `${fromName} <${fromAddress}>`,
        otpCode: extractedOtp?.code,
        previewText: text,
        messageId: id,
        deepLinkUrl: `${c.env.MINI_APP_URL || 'https://t.me/tempbox_bot/app'}?email=${id}`
      },
      {
        botToken: c.env.TELEGRAM_BOT_TOKEN,
        miniAppUrl: c.env.MINI_APP_URL
      }
    );
  }

  const message: EmailMessage = {
    id,
    mailboxId: mailbox.id,
    from: { name: fromName, address: fromAddress },
    to: [mailbox.address],
    subject,
    text,
    html,
    headers: {
      from: `"${fromName}" <${fromAddress}>`,
      to: mailbox.address,
      subject
    },
    spf: 'pass',
    dkim: 'pass',
    dmarc: 'pass',
    attachments: [],
    extractedOtp,
    receivedAt: now,
    expiresAt,
    isRead: false
  };

  return c.json({ success: true, message }, 201);
});

// POST /api/simulations/webhook - Ingest a mock webhook event
simulationRouter.post('/webhook', async (c) => {
  const db = c.env.DB;
  const body: SimulationPayload = await c.req.json();
  const mailboxId = body.mailboxId;

  const mailbox = await db
    .prepare('SELECT id, address, expires_at, telegram_user_id FROM mailboxes WHERE id = ?')
    .bind(mailboxId)
    .first<{ id: string; address: string; expires_at: number; telegram_user_id?: string }>();

  if (!mailbox) {
    return c.json({ error: 'Mailbox not found' }, 404);
  }

  const id = generateId('wh');
  const now = Date.now();
  const expiresAt = Number(mailbox.expires_at) || now + 3600 * 1000;

  let method = 'POST';
  let path = '/v1/webhook/stripe';
  let payload: Record<string, unknown> = {
    id: 'evt_test_1234567890',
    object: 'event',
    type: 'payment_intent.succeeded',
    created: Math.floor(now / 1000),
    data: {
      object: {
        id: 'pi_3MtwBwLkdIwHu7ix28a3tqPa',
        amount: 2999,
        currency: 'usd',
        status: 'succeeded',
        customer: 'cus_N992814b'
      }
    }
  };

  if (body.customData?.jsonPayload) {
    payload = body.customData.jsonPayload;
    path = '/custom/hook';
  }

  const rawBody = JSON.stringify(payload, null, 2);
  const headers = {
    'content-type': 'application/json',
    'user-agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)',
    'stripe-signature': 't=1690000000,v1=5257a869e7ecebeda32affa62cd4ff0f10fb76bc2b2fa87d30f9'
  };

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
      `https://tempbox.dev/h/${id}`,
      JSON.stringify({}),
      JSON.stringify(headers),
      rawBody,
      rawBody,
      '54.187.205.235',
      now,
      expiresAt
    )
    .run();

  if (mailbox.telegram_user_id) {
    await sendTelegramPushNotification(
      {
        telegramUserId: mailbox.telegram_user_id,
        type: 'webhook',
        mailboxAddress: mailbox.address,
        subject: `${method} ${path}`,
        previewText: rawBody,
        messageId: id,
        deepLinkUrl: `${c.env.MINI_APP_URL || 'https://t.me/tempbox_bot/app'}?webhook=${id}`
      },
      {
        botToken: c.env.TELEGRAM_BOT_TOKEN,
        miniAppUrl: c.env.MINI_APP_URL
      }
    );
  }

  return c.json({ success: true, id, message: 'Mock webhook event simulated successfully' }, 201);
});
