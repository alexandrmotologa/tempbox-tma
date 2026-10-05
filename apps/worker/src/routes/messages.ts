import { Hono } from 'hono';
import type { D1DatabaseCompat } from '../db/database.js';
import type { EmailMessage } from '@tempbox/shared-types';

interface Env {
  DB: D1DatabaseCompat;
}

export const messageRouter = new Hono<{ Bindings: Env }>();

// GET /api/mailboxes/:id/messages
messageRouter.get('/', async (c) => {
  const db = c.env.DB;
  const mailboxId = c.req.param('id');

  const rows = await db
    .prepare('SELECT * FROM email_messages WHERE mailbox_id = ? ORDER BY received_at DESC')
    .bind(mailboxId)
    .all<Record<string, unknown>>();

  const emails: EmailMessage[] = (rows.results || []).map((e) => ({
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
    extractedMagicLink: e.magic_link_url
      ? {
          url: String(e.magic_link_url),
          label: e.magic_link_label ? String(e.magic_link_label) : 'Verification Link',
          domain: e.magic_link_domain ? String(e.magic_link_domain) : 'link',
          confidence: 0.95
        }
      : undefined,
    receivedAt: Number(e.received_at),
    expiresAt: Number(e.expires_at),
    isRead: Boolean(e.is_read)
  }));

  return c.json({ emails });
});

// GET /api/mailboxes/:id/messages/:messageId/raw - Download raw .EML file
messageRouter.get('/:messageId/raw', async (c) => {
  const db = c.env.DB;
  const mailboxId = c.req.param('id');
  const messageId = c.req.param('messageId');

  const row = await db
    .prepare('SELECT * FROM email_messages WHERE id = ? AND mailbox_id = ?')
    .bind(messageId, mailboxId)
    .first<Record<string, unknown>>();

  if (!row) {
    return c.json({ error: 'Message not found' }, 404);
  }

  const from = row.from_name ? `"${row.from_name}" <${row.from_address}>` : String(row.from_address);
  const to = JSON.parse(String(row.to_addresses || '[]')).join(', ');
  const subject = String(row.subject);
  const date = new Date(Number(row.received_at)).toUTCString();

  const emlContent = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    row.html_content || row.text_content || ''
  ].join('\r\n');

  c.header('Content-Type', 'message/rfc822');
  c.header('Content-Disposition', `attachment; filename="message-${messageId}.eml"`);
  return c.body(emlContent);
});

// GET /api/mailboxes/:id/messages/:messageId
messageRouter.get('/:messageId', async (c) => {
  const db = c.env.DB;
  const mailboxId = c.req.param('id');
  const messageId = c.req.param('messageId');

  const row = await db
    .prepare('SELECT * FROM email_messages WHERE id = ? AND mailbox_id = ?')
    .bind(messageId, mailboxId)
    .first<Record<string, unknown>>();

  if (!row) {
    return c.json({ error: 'Message not found' }, 404);
  }

  // Mark as read
  await db.prepare('UPDATE email_messages SET is_read = 1 WHERE id = ?').bind(messageId).run();

  const email: EmailMessage = {
    id: String(row.id),
    mailboxId: String(row.mailbox_id),
    from: {
      name: row.from_name ? String(row.from_name) : undefined,
      address: String(row.from_address)
    },
    to: JSON.parse(String(row.to_addresses || '[]')),
    subject: String(row.subject),
    text: row.text_content ? String(row.text_content) : undefined,
    html: row.html_content ? String(row.html_content) : undefined,
    headers: JSON.parse(String(row.headers_json || '{}')),
    spf: row.spf as EmailMessage['spf'],
    dkim: row.dkim as EmailMessage['dkim'],
    dmarc: row.dmarc as EmailMessage['dmarc'],
    attachments: JSON.parse(String(row.attachments_json || '[]')),
    extractedOtp: row.otp_code
      ? {
          code: String(row.otp_code),
          kind: (row.otp_kind as 'numeric' | 'alphanumeric') || 'numeric',
          confidence: Number(row.otp_confidence || 0.9),
          contextSnippet: row.otp_snippet ? String(row.otp_snippet) : undefined
        }
      : undefined,
    extractedMagicLink: row.magic_link_url
      ? {
          url: String(row.magic_link_url),
          label: row.magic_link_label ? String(row.magic_link_label) : 'Verification Link',
          domain: row.magic_link_domain ? String(row.magic_link_domain) : 'link',
          confidence: 0.95
        }
      : undefined,
    receivedAt: Number(row.received_at),
    expiresAt: Number(row.expires_at),
    isRead: true
  };

  return c.json({ email });
});

// DELETE /api/mailboxes/:id/messages/:messageId
messageRouter.delete('/:messageId', async (c) => {
  const db = c.env.DB;
  const mailboxId = c.req.param('id');
  const messageId = c.req.param('messageId');

  await db.prepare('DELETE FROM email_messages WHERE id = ? AND mailbox_id = ?').bind(messageId, mailboxId).run();
  return c.json({ success: true });
});
