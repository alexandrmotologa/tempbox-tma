import type { D1DatabaseCompat } from '../db/database.js';

export interface PurgeResult {
  purgedMailboxes: number;
  purgedEmails: number;
  purgedWebhooks: number;
  timestamp: number;
}

/**
 * Sweeps the database for expired mailboxes, emails, and webhooks according to TTL timestamps.
 */
export async function purgeExpiredRecords(db: D1DatabaseCompat): Promise<PurgeResult> {
  const now = Date.now();

  // Purge expired emails
  const emailRes = await db.prepare('DELETE FROM email_messages WHERE expires_at < ?').bind(now).run();
  const purgedEmails = (emailRes.meta?.changes as number) || 0;

  // Purge expired webhooks
  const hookRes = await db.prepare('DELETE FROM webhook_requests WHERE expires_at < ?').bind(now).run();
  const purgedWebhooks = (hookRes.meta?.changes as number) || 0;

  // Purge expired mailboxes
  const mbRes = await db.prepare('DELETE FROM mailboxes WHERE expires_at < ?').bind(now).run();
  const purgedMailboxes = (mbRes.meta?.changes as number) || 0;

  return {
    purgedMailboxes,
    purgedEmails,
    purgedWebhooks,
    timestamp: now
  };
}
