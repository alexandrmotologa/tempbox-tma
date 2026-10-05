import type {
  CreateMailboxRequest,
  MailboxOverviewResponse,
  Mailbox,
  SimulationPayload
} from '@tempbox/shared-types';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!res.ok) {
    const errorText = await res.text();
    let msg = `Request failed: ${res.status}`;
    try {
      const parsed = JSON.parse(errorText);
      msg = parsed.error || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return res.json();
}

export const api = {
  createMailbox: (req: CreateMailboxRequest = {}) =>
    fetchJson<{ mailbox: Mailbox }>('/api/mailboxes', {
      method: 'POST',
      body: JSON.stringify(req)
    }),

  getOverview: (mailboxId: string) =>
    fetchJson<MailboxOverviewResponse>(`/api/mailboxes/${mailboxId}/overview`),

  extendTtl: (mailboxId: string) =>
    fetchJson<{ success: boolean; expiresAt: number }>(`/api/mailboxes/${mailboxId}/extend`, {
      method: 'POST'
    }),

  purgeMailbox: (mailboxId: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/mailboxes/${mailboxId}`, {
      method: 'DELETE'
    }),

  deleteEmail: (mailboxId: string, messageId: string) =>
    fetchJson<{ success: boolean }>(`/api/mailboxes/${mailboxId}/messages/${messageId}`, {
      method: 'DELETE'
    }),

  deleteWebhook: (mailboxId: string, webhookId: string) =>
    fetchJson<{ success: boolean }>(`/api/mailboxes/${mailboxId}/webhooks/${webhookId}`, {
      method: 'DELETE'
    }),

  simulateEmail: (payload: SimulationPayload) =>
    fetchJson<{ success: boolean; message: any }>('/api/simulations/email', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  simulateWebhook: (payload: SimulationPayload) =>
    fetchJson<{ success: boolean; id: string }>('/api/simulations/webhook', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};
