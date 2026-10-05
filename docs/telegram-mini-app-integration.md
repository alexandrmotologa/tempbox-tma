# Telegram Mini App & Bot Integration

This document covers configuring the Telegram Bot with BotFather, connecting the Mini App, and handling push notifications.

## 1. BotFather Configuration

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot` and follow the prompts to choose a bot name (such as `TempBox`) and username (such as `tempbox_dev_bot`).
3. Save the HTTP API token provided by BotFather.
4. Set up the Telegram Mini App shortcut:
   - Send `/newapp` to `@BotFather`.
   - Select your bot.
   - Enter title: `TempBox`.
   - Enter description: `Disposable email and webhook inbox`.
   - Provide avatar and demo images.
   - Set the Web App URL to your deployed frontend domain (e.g. `https://tempbox.pages.dev`).
   - Choose a short name for the URL: `app` (giving `t.me/tempbox_dev_bot/app`).

## 2. Setting Bot Commands

Send `/setcommands` to `@BotFather` and paste:

```
start - Open welcome screen and launch TempBox Mini App
new - Generate a new disposable email address and webhook
help - Show usage instructions and command list
purge - Immediately delete all active disposable mailboxes
```

## 3. Webhook Registration

To direct incoming bot commands directly to the worker:

```bash
curl -F "url=https://worker.tempbox.dev/api/telegram/webhook" \
  https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

## 4. Deep-Linking and Navigation

The Mini App supports the `startapp` parameter for deep-linking directly to individual messages:

- Email deep link: `https://t.me/tempbox_dev_bot/app?startapp=msg_123`
- Webhook deep link: `https://t.me/tempbox_dev_bot/app?startapp=wh_456`

When opened, the Mini App checks URL search parameters and expands the targeted email or webhook immediately.

## 5. Haptic Feedback

The application uses Telegram WebApp HapticFeedback APIs:

- **Impact Light:** Triggered when switching tabs, refreshing, or opening dialogs.
- **Impact Medium:** Triggered when clicking purge or delete actions.
- **Notification Success:** Triggered whenever the user copies an email address, webhook URL, or verification code to the clipboard.
