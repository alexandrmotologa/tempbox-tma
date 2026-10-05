import type { TelegramNotificationPayload } from '@tempbox/shared-types';

export function formatNotificationHtml(payload: TelegramNotificationPayload): string {
  const lines: string[] = [];

  if (payload.type === 'email') {
    lines.push('📬 <b>New Disposable Email</b>');
    lines.push(`<b>Inbox:</b> <code>${payload.mailboxAddress}</code>`);

    if (payload.sender) {
      lines.push(`<b>From:</b> ${payload.sender}`);
    }

    if (payload.subject) {
      lines.push(`<b>Subject:</b> ${payload.subject}`);
    }

    if (payload.otpCode) {
      lines.push('');
      lines.push(`🔑 <b>OTP Code:</b> <code>${payload.otpCode}</code> (Tap to copy)`);
    }

    if (payload.previewText) {
      lines.push('');
      lines.push(`<i>${payload.previewText.slice(0, 160)}...</i>`);
    }
  } else {
    lines.push('⚡ <b>New Webhook Captured</b>');
    lines.push(`<b>Inbox:</b> <code>${payload.mailboxAddress}</code>`);
    if (payload.subject) {
      lines.push(`<b>Request:</b> <code>${payload.subject}</code>`);
    }
    if (payload.previewText) {
      lines.push('');
      lines.push(`<pre>${payload.previewText.slice(0, 300)}</pre>`);
    }
  }

  return lines.join('\n');
}

export function createMessageKeyboards(payload: TelegramNotificationPayload, miniAppUrl: string) {
  const keyboard: Array<Array<{ text: string; url?: string; callback_data?: string; web_app?: { url: string } }>> = [];

  const row: Array<{ text: string; url?: string; callback_data?: string; web_app?: { url: string } }> = [];

  if (payload.otpCode) {
    row.push({
      text: `📋 Copy: ${payload.otpCode}`,
      callback_data: `copy:${payload.otpCode}`
    });
  }

  row.push({
    text: '📱 Open in TempBox',
    web_app: { url: payload.deepLinkUrl || miniAppUrl }
  });

  keyboard.push(row);
  return { inline_keyboard: keyboard };
}
