import type { TelegramNotificationPayload } from '@tempbox/shared-types';

export interface TelegramNotifierConfig {
  botToken?: string;
  miniAppUrl?: string;
}

/**
 * Sends real-time push notifications to Telegram users when new emails or webhooks arrive.
 */
export async function sendTelegramPushNotification(
  payload: TelegramNotificationPayload,
  config: TelegramNotifierConfig
): Promise<boolean> {
  const token = config.botToken;
  if (!token) {
    // In local dev or unconfigured environments, log notification payload
    console.log('[TelegramNotifier] Bot token not provided. Simulated push:', {
      user: payload.telegramUserId,
      type: payload.type,
      subject: payload.subject,
      otp: payload.otpCode
    });
    return true;
  }

  try {
    const text = formatTelegramMessage(payload);
    const replyMarkup = buildInlineKeyboard(payload, config.miniAppUrl);

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: payload.telegramUserId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: replyMarkup
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[TelegramNotifier] Failed to send push notification:', err);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[TelegramNotifier] Error dispatching push notification:', error);
    return false;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatTelegramMessage(payload: TelegramNotificationPayload): string {
  const parts: string[] = [];

  if (payload.type === 'email') {
    parts.push('📬 <b>New Disposable Email Received</b>');
    parts.push(`<b>Inbox:</b> <code>${escapeHtml(payload.mailboxAddress)}</code>`);

    if (payload.sender) {
      parts.push(`<b>From:</b> ${escapeHtml(payload.sender)}`);
    }

    if (payload.subject) {
      parts.push(`<b>Subject:</b> ${escapeHtml(payload.subject)}`);
    }

    if (payload.otpCode) {
      parts.push('');
      parts.push(`🔑 <b>Verification Code:</b> <code>${escapeHtml(payload.otpCode)}</code>`);
      parts.push('<i>(Tap code above to copy immediately)</i>');
    }

    if (payload.previewText) {
      const snippet = payload.previewText.slice(0, 160).trim();
      if (snippet) {
        parts.push('');
        parts.push(`📝 <i>${escapeHtml(snippet)}...</i>`);
      }
    }
  } else {
    parts.push('⚡ <b>New Webhook Captured</b>');
    parts.push(`<b>Endpoint:</b> <code>${escapeHtml(payload.mailboxAddress)}</code>`);
    if (payload.subject) {
      parts.push(`<b>Method:</b> <code>${escapeHtml(payload.subject)}</code>`);
    }
    if (payload.previewText) {
      parts.push('');
      parts.push(`<b>Payload:</b>\n<pre>${escapeHtml(payload.previewText.slice(0, 300))}</pre>`);
    }
  }

  return parts.join('\n');
}

function buildInlineKeyboard(payload: TelegramNotificationPayload, miniAppUrl?: string) {
  const rows: Array<Array<{ text: string; url?: string; callback_data?: string; web_app?: { url: string } }>> = [];

  const targetUrl = miniAppUrl || 'https://t.me/tempbox_bot/app';
  const deepLink = `${targetUrl}?startapp=${payload.messageId}`;

  const row1: Array<{ text: string; url?: string; callback_data?: string; web_app?: { url: string } }> = [];

  if (payload.otpCode) {
    row1.push({
      text: `📋 Copy OTP: ${payload.otpCode}`,
      callback_data: `copy_otp:${payload.otpCode}`
    });
  }

  row1.push({
    text: '📱 Open in TempBox',
    web_app: { url: deepLink }
  });

  rows.push(row1);

  return { inline_keyboard: rows };
}
