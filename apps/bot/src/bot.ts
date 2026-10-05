import { extractVerificationCode } from './otp.js';
import { formatNotificationHtml, createMessageKeyboards } from './notifier.js';

export interface BotConfig {
  botToken: string;
  workerApiUrl: string;
  miniAppUrl: string;
}

export class TempBoxTelegramBot {
  private token: string;
  private workerApiUrl: string;
  private miniAppUrl: string;

  constructor(config: BotConfig) {
    this.token = config.botToken;
    this.workerApiUrl = config.workerApiUrl.replace(/\/$/, '');
    this.miniAppUrl = config.miniAppUrl;
  }

  async sendApi(method: string, payload: Record<string, unknown>): Promise<any> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  async handleUpdate(update: any): Promise<void> {
    if (update.message?.text) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallback(update.callback_query);
    }
  }

  private async handleMessage(msg: any): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const userId = String(msg.from?.id || chatId);

    if (text.startsWith('/start')) {
      const welcome = [
        '📬 <b>Welcome to TempBox!</b>',
        '',
        'Your disposable email & webhook inbox inside Telegram.',
        'Zero ads, zero trackers, 1-tap OTP verification extraction.',
        '',
        'Tap <b>Open TempBox</b> below to start using your temporary inbox.'
      ].join('\n');

      await this.sendApi('sendMessage', {
        chat_id: chatId,
        text: welcome,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📱 Open TempBox App', web_app: { url: this.miniAppUrl } },
              { text: '⚡ New Address', callback_data: 'generate_new' }
            ]
          ]
        }
      });
      return;
    }

    if (text.startsWith('/new')) {
      try {
        const res = await fetch(`${this.workerApiUrl}/api/mailboxes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramUserId: userId, ttlSeconds: 7200 })
        });
        const data = await res.json();
        const mb = data.mailbox;

        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: [
            '✨ <b>New Disposable Inbox Created!</b>',
            '',
            `📧 <b>Address:</b> <code>${mb.address}</code>`,
            `⚡ <b>Webhook:</b> <code>${mb.webhookUrl}</code>`,
            '⏳ <b>Lifespan:</b> 2 Hours',
            '',
            'Verification codes sent here will trigger instant Telegram alerts.'
          ].join('\n'),
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Open Inbox', web_app: { url: `${this.miniAppUrl}?mailbox=${mb.id}` } }]
            ]
          }
        });
      } catch (err) {
        await this.sendApi('sendMessage', {
          chat_id: chatId,
          text: 'Failed to contact backend service. Please try again later.'
        });
      }
      return;
    }

    if (text.startsWith('/help')) {
      await this.sendApi('sendMessage', {
        chat_id: chatId,
        text: [
          '📖 <b>TempBox Help & Commands</b>',
          '',
          '/new - Generate a new disposable email address and webhook',
          '/start - Open the Welcome screen and Mini App launch button',
          '/purge - Immediately erase all active inboxes',
          '/help - Show this manual',
          '',
          'All disposable inboxes expire automatically after 2 hours.'
        ].join('\n'),
        parse_mode: 'HTML'
      });
      return;
    }

    // Default fallback
    await this.sendApi('sendMessage', {
      chat_id: chatId,
      text: 'Send /new to create a new inbox or tap below to open the Mini App.',
      reply_markup: {
        inline_keyboard: [[{ text: '📱 Open TempBox', web_app: { url: this.miniAppUrl } }]]
      }
    });
  }

  private async handleCallback(cb: any): Promise<void> {
    const data = cb.data || '';
    if (data.startsWith('copy:') || data.startsWith('copy_otp:')) {
      const code = data.split(':')[1];
      await this.sendApi('answerCallbackQuery', {
        callback_query_id: cb.id,
        text: `Copied code ${code}!`,
        show_alert: false
      });
    } else {
      await this.sendApi('answerCallbackQuery', {
        callback_query_id: cb.id
      });
    }
  }
}

// Standalone runner if executed directly
if (process.env.TELEGRAM_BOT_TOKEN) {
  const bot = new TempBoxTelegramBot({
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    workerApiUrl: process.env.WORKER_API_URL || 'http://localhost:8787',
    miniAppUrl: process.env.MINI_APP_URL || 'https://t.me/tempbox_bot/app'
  });
  console.log('[TempBox Bot] Initialized bot handler');
}
