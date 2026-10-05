import { useState, useEffect, useCallback, useRef } from 'react';
import type { Mailbox, EmailMessage, WebhookRequest } from '@tempbox/shared-types';
import { api } from '../lib/api.js';

const STORAGE_KEY = 'tempbox_active_mailbox_id';

export function useMailbox(telegramUserId?: number | string) {
  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(7200);

  const activeIdRef = useRef<string | null>(null);

  // Load overview data
  const loadData = useCallback(async (id: string, showSpinner = false) => {
    try {
      if (showSpinner) setIsRefreshing(true);
      const data = await api.getOverview(id);
      setMailbox(data.mailbox);
      setEmails(data.emails);
      setWebhooks(data.webhooks);
      activeIdRef.current = data.mailbox.id;
      localStorage.setItem(STORAGE_KEY, data.mailbox.id);
    } catch (err) {
      console.error('[useMailbox] Error loading mailbox:', err);
      // If mailbox expired or not found, clear storage and generate new
      localStorage.removeItem(STORAGE_KEY);
      activeIdRef.current = null;
      await createInitialMailbox();
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Create initial or new mailbox
  const createInitialMailbox = useCallback(async (alias?: string) => {
    try {
      setIsLoading(true);
      const res = await api.createMailbox({
        alias,
        telegramUserId,
        ttlSeconds: 7200
      });
      setMailbox(res.mailbox);
      setEmails([]);
      setWebhooks([]);
      activeIdRef.current = res.mailbox.id;
      localStorage.setItem(STORAGE_KEY, res.mailbox.id);
    } catch (err) {
      console.error('[useMailbox] Error creating mailbox:', err);
    } finally {
      setIsLoading(false);
    }
  }, [telegramUserId]);

  // Initial load
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      loadData(savedId);
    } else {
      createInitialMailbox();
    }
  }, [loadData, createInitialMailbox]);

  // Auto-polling every 4 seconds
  useEffect(() => {
    if (!mailbox?.id) return;

    const interval = setInterval(() => {
      if (activeIdRef.current) {
        loadData(activeIdRef.current, false);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [mailbox?.id, loadData]);

  // TTL countdown timer every second
  useEffect(() => {
    if (!mailbox?.expiresAt) return;

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((mailbox.expiresAt - Date.now()) / 1000));
      setRemainingSeconds(diff);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [mailbox?.expiresAt]);

  // Action: Extend TTL
  const extend = useCallback(async () => {
    if (!mailbox) return;
    try {
      const res = await api.extendTtl(mailbox.id);
      setMailbox((prev) => (prev ? { ...prev, expiresAt: res.expiresAt } : null));
    } catch (err) {
      console.error('[useMailbox] Extend error:', err);
    }
  }, [mailbox]);

  // Action: Purge Mailbox
  const purge = useCallback(async () => {
    if (!mailbox) return;
    try {
      await api.purgeMailbox(mailbox.id);
      localStorage.removeItem(STORAGE_KEY);
      await createInitialMailbox();
    } catch (err) {
      console.error('[useMailbox] Purge error:', err);
    }
  }, [mailbox, createInitialMailbox]);

  // Action: Delete Email
  const deleteEmail = useCallback(async (msgId: string) => {
    if (!mailbox) return;
    setEmails((prev) => prev.filter((m) => m.id !== msgId));
    try {
      await api.deleteEmail(mailbox.id, msgId);
    } catch (err) {
      console.error('[useMailbox] Delete email error:', err);
    }
  }, [mailbox]);

  // Action: Delete Webhook
  const deleteWebhook = useCallback(async (hookId: string) => {
    if (!mailbox) return;
    setWebhooks((prev) => prev.filter((w) => w.id !== hookId));
    try {
      await api.deleteWebhook(mailbox.id, hookId);
    } catch (err) {
      console.error('[useMailbox] Delete webhook error:', err);
    }
  }, [mailbox]);

  // Format countdown string
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const formattedTtl = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const totalTtl = mailbox?.ttlSeconds || 7200;
  const percentRemaining = Math.min(100, Math.max(0, (remainingSeconds / totalTtl) * 100));

  return {
    mailbox,
    emails,
    webhooks,
    isLoading,
    isRefreshing,
    remainingSeconds,
    formattedTtl,
    percentRemaining,
    refresh: () => (activeIdRef.current ? loadData(activeIdRef.current, true) : null),
    generateNew: createInitialMailbox,
    extend,
    purge,
    deleteEmail,
    deleteWebhook
  };
}
