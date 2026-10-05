import { Hono } from 'hono';
import type { D1DatabaseCompat } from '../db/database.js';

interface Env {
  DB: D1DatabaseCompat;
  TELEGRAM_BOT_TOKEN?: string;
  MINI_APP_URL?: string;
  DEFAULT_DOMAIN?: string;
  BASE_URL?: string;
}

export const telegramRouter = new Hono<{ Bindings: Env }>();

telegramRouter.post('/webhook', async (c) => {
  const token = c.env.TELEGRAM_BOT_TOKEN;
  const db = c.env.DB;
  const miniAppUrl = c.env.MINI_APP_URL || 'https://t.me/tempbox_bot/app';
  const defaultDomain = c.env.DEFAULT_DOMAIN || 'tempbox.dev';

  let update: any;
  try {
    update = await c.req.json();
  } catch {
    return c.text('OK');
  }

  // Handle messages
  const message = update.message;
  if (!message || !message.text) {
    // Handle inline callback query (e.g., copy_otp)
    if (update.callback_query) {
      const cb = update.callback_query;
      if (token) {
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: cb.id,
            text: 'Code copied!',
            show_alert: false
          })
        });
      }
    }
    return c.text('OK');
  }

  const chatId = message.chat.id;
  const text = message.text.trim();
  const userId = String(message.from?.id || chatId);

  // Command handlers
  if (text.startsWith('/start')) {
    const welcome = [
      '📬 <b>Welcome to TempBox!</b>',
      '',
      'Your secure disposable email & webhook inbox inside Telegram.',
      '',
      '✨ <b>Key Features:</b>',
      '• Instant throwaway email addresses',
      '• Live webhook payload inspector',
      '• Automatic 1-tap OTP verification extraction',
      '• Zero tracking & automatic 2-hour TTL wipeout',
      '',
      'Tap below to open your inbox Mini App or type /new to generate a new address.'
    ].join('\n');

    await sendTelegramMessage(token, chatId, welcome, {
      inline_keyboard: [
        [
          { text: '📱 Open TempBox App', web_app: { url: miniAppUrl } },
          { text: '⚡ New Address', callback_data: 'cmd_new' }
        ]
      ]
    });
  } else if (text.startsWith('/new')) {
    // Generate new mailbox for user
    const slug = Math.random().toString(36).substring(2, 9);
    const address = `${slug}@${defaultDomain}`;
    const mbId = `mb_${slug}_${Math.random().toString(36).substring(2, 6)}`;
    const hexToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const now = Date.now();
    const expiresAt = now + 7200 * 1000; // 2 hours
    const baseUrl = c.env.BASE_URL || 'https://tempbox.dev';
    const webhookUrl = `${baseUrl}/h/${hexToken}`;

    await db
      .prepare(
        `INSERT INTO mailboxes (
          id, address, alias, domain, token, webhook_url, telegram_user_id, created_at, expires_at, ttl_seconds, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      )
      .bind(mbId, address, slug, defaultDomain, hexToken, webhookUrl, userId, now, expiresAt, 7200)
      .run();

    const response = [
      '🎉 <b>Your New Disposable Inbox is Ready!</b>',
      '',
      `📧 <b>Email Address:</b> <code>${address}</code>`,
      `⚡ <b>Webhook URL:</b> <code>${webhookUrl}</code>`,
      '',
      '⏳ <b>Lifespan:</b> 2 Hours (Auto-purged afterwards)',
      '',
      'When verification codes arrive, you will get an instant push notification.'
    ].join('\n');

    await sendTelegramMessage(token, chatId, response, {
      inline_keyboard: [
        [{ text: '📱 View Inbox', web_app: { url: `${miniAppUrl}?mailbox=${mbId}` } }]
      ]
    });
  } else if (text.startsWith('/purge')) {
    await db.prepare('DELETE FROM mailboxes WHERE telegram_user_id = ?').bind(userId).run();
    await sendTelegramMessage(token, chatId, '🧹 All your active disposable mailboxes and stored messages have been purged.');
  } else {
    // Default reply
    await sendTelegramMessage(
      token,
      chatId,
      'Type /new to generate a new disposable address or open the Mini App below.',
      {
        inline_keyboard: [[{ text: '📱 Open TempBox App', web_app: { url: miniAppUrl } }]]
      }
    );
  }

  return c.text('OK');
});

async function sendTelegramMessage(token: string | undefined, chatId: number | string, text: string, replyMarkup?: any) {
  if (!token) {
    console.log('[TelegramBotSim] Message to', chatId, ':', text);
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });
  } catch (err) {
    console.error('[TelegramBot] sendMessage error:', err);
  }
}
