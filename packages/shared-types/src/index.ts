export type OtpKind = 'numeric' | 'alphanumeric' | 'token';

export interface ExtractedOtp {
  code: string;
  kind: OtpKind;
  confidence: number;
  label?: string;
  contextSnippet?: string;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  contentId?: string;
  downloadUrl?: string;
}

export interface EmailMessage {
  id: string;
  mailboxId: string;
  from: {
    name?: string;
    address: string;
  };
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  headers: Record<string, string>;
  spf?: 'pass' | 'fail' | 'softfail' | 'none';
  dkim?: 'pass' | 'fail' | 'softfail' | 'none';
  dmarc?: 'pass' | 'fail' | 'softfail' | 'none';
  attachments: EmailAttachment[];
  extractedOtp?: ExtractedOtp;
  receivedAt: number; // Unix timestamp in ms
  expiresAt: number; // Unix timestamp in ms
  isRead: boolean;
}

export interface WebhookRequest {
  id: string;
  mailboxId: string;
  method: string;
  path: string;
  url: string;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
  rawBody: string;
  ip: string;
  receivedAt: number; // Unix timestamp in ms
  expiresAt: number; // Unix timestamp in ms
}

export interface Mailbox {
  id: string;
  address: string;
  alias: string;
  domain: string;
  token: string; // Secret access token for polling / management
  webhookUrl: string;
  createdAt: number;
  expiresAt: number;
  ttlSeconds: number;
  telegramUserId?: number | string;
  active: boolean;
  emailCount: number;
  webhookCount: number;
}

export interface CreateMailboxRequest {
  alias?: string;
  domain?: string;
  ttlSeconds?: number;
  telegramUserId?: number | string;
}

export interface CreateMailboxResponse {
  mailbox: Mailbox;
}

export interface MailboxOverviewResponse {
  mailbox: Mailbox;
  emails: EmailMessage[];
  webhooks: WebhookRequest[];
}

export interface TelegramNotificationPayload {
  telegramUserId: number | string;
  type: 'email' | 'webhook';
  mailboxAddress: string;
  subject?: string;
  sender?: string;
  otpCode?: string;
  previewText?: string;
  messageId: string;
  deepLinkUrl: string;
}

export interface SimulationPayload {
  mailboxId: string;
  template: 'github_otp' | 'google_security' | 'stripe_webhook' | 'custom_email' | 'custom_webhook';
  customData?: {
    from?: string;
    subject?: string;
    code?: string;
    body?: string;
    jsonPayload?: Record<string, unknown>;
  };
}
