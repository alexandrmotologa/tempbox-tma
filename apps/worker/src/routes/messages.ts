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
    receivedAt: Number(e.received_at),
    expiresAt: Number(e.expires_at),
    isRead: Boolean(e.is_read)
  }));

  return c.json({ emails });
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
