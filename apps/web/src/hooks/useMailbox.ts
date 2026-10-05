import { useState, useEffect, useCallback, useRef } from 'react';
import type { Mailbox, EmailMessage, WebhookRequest, WebhookResponseConfig } from '@tempbox/shared-types';
import { api } from '../lib/api.js';
import { sounds } from '../lib/sounds.js';

const STORAGE_ACTIVE_KEY = 'tempbox_active_mailbox_id';
const STORAGE_LIST_KEY = 'tempbox_mailboxes_list';

export function useMailbox(telegramUserId?: number | string) {
  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [allMailboxes, setAllMailboxes] = useState<Mailbox[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(7200);
  const [selectedDomain, setSelectedDomain] = useState('tempbox.dev');

  const activeIdRef = useRef<string | null>(null);
  const prevEmailCountRef = useRef<number>(0);
  const prevWebhookCountRef = useRef<number>(0);

  // Sync list of mailboxes in localStorage
  const saveMailboxToList = useCallback((newMb: Mailbox) => {
    try {
      const raw = localStorage.getItem(STORAGE_LIST_KEY);
      const list: Mailbox[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((m) => m.id !== newMb.id && m.expiresAt > Date.now());
      filtered.unshift(newMb);
      const capped = filtered.slice(0, 5); // Keep up to 5 active
      localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(capped));
      setAllMailboxes(capped);
    } catch {
      // ignore
    }
  }, []);

  // Load overview data for a specific mailbox
  const loadData = useCallback(async (id: string, showSpinner = false) => {
    try {
      if (showSpinner) setIsRefreshing(true);
      const data = await api.getOverview(id);
      setMailbox(data.mailbox);
      setEmails(data.emails);
      setWebhooks(data.webhooks);
      activeIdRef.current = data.mailbox.id;
      localStorage.setItem(STORAGE_ACTIVE_KEY, data.mailbox.id);
      saveMailboxToList(data.mailbox);

      // Check if new emails arrived and play tactile sound
      if (prevEmailCountRef.current > 0 && data.emails.length > prevEmailCountRef.current) {
        sounds.playNewMessage();
      }
      prevEmailCountRef.current = data.emails.length;

      // Check if new webhooks arrived
      if (prevWebhookCountRef.current > 0 && data.webhooks.length > prevWebhookCountRef.current) {
        sounds.playNewMessage();
      }
      prevWebhookCountRef.current = data.webhooks.length;

      // Merge backend userMailboxes if any
      if (data.userMailboxes && data.userMailboxes.length > 0) {
        setAllMailboxes((prev) => {
          const map = new Map<string, Mailbox>();
          for (const m of [...prev, ...(data.userMailboxes || [])]) {
            map.set(m.id, m);
          }
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error('[useMailbox] Error loading mailbox:', err);
      localStorage.removeItem(STORAGE_ACTIVE_KEY);
      activeIdRef.current = null;
      await createInitialMailbox();
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [saveMailboxToList]);

  // Create initial or new mailbox
  const createInitialMailbox = useCallback(
    async (alias?: string, customDomain?: string) => {
      try {
        setIsLoading(true);
        const domainToUse = customDomain || selectedDomain;
        const res = await api.createMailbox({
          alias,
          domain: domainToUse,
          telegramUserId,
          ttlSeconds: 7200
        });
        setMailbox(res.mailbox);
        setEmails([]);
        setWebhooks([]);
        activeIdRef.current = res.mailbox.id;
        localStorage.setItem(STORAGE_ACTIVE_KEY, res.mailbox.id);
        saveMailboxToList(res.mailbox);
        prevEmailCountRef.current = 0;
        prevWebhookCountRef.current = 0;
      } catch (err) {
        console.error('[useMailbox] Error creating mailbox:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedDomain, telegramUserId, saveMailboxToList]
  );

  // Initial load
  useEffect(() => {
    // Load saved domain
    const savedDomain = localStorage.getItem('tempbox_default_domain');
    if (savedDomain) setSelectedDomain(savedDomain);

    // Load saved list
    try {
      const raw = localStorage.getItem(STORAGE_LIST_KEY);
      if (raw) {
        const list: Mailbox[] = JSON.parse(raw);
        setAllMailboxes(list.filter((m) => m.expiresAt > Date.now()));
      }
    } catch {
      // ignore
    }

    const savedId = localStorage.getItem(STORAGE_ACTIVE_KEY);
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

  // Action: Switch active mailbox
  const switchMailbox = useCallback(
    (id: string) => {
      if (id === mailbox?.id) return;
      setIsLoading(true);
      loadData(id);
    },
    [mailbox?.id, loadData]
  );

  // Action: Extend TTL
  const extend = useCallback(async () => {
    if (!mailbox) return;
    try {
      const res = await api.extendTtl(mailbox.id);
      setMailbox((prev) => (prev ? { ...prev, expiresAt: res.expiresAt } : null));
      sounds.playTap();
    } catch (err) {
      console.error('[useMailbox] Extend error:', err);
    }
  }, [mailbox]);

  // Action: Purge Mailbox
  const purge = useCallback(async () => {
    if (!mailbox) return;
    try {
      sounds.playPurge();
      await api.purgeMailbox(mailbox.id);

      // Remove from list
      const raw = localStorage.getItem(STORAGE_LIST_KEY);
      if (raw) {
        const list: Mailbox[] = JSON.parse(raw);
        const remaining = list.filter((m) => m.id !== mailbox.id);
        localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(remaining));
        setAllMailboxes(remaining);
      }

      localStorage.removeItem(STORAGE_ACTIVE_KEY);
      await createInitialMailbox();
    } catch (err) {
      console.error('[useMailbox] Purge error:', err);
    }
  }, [mailbox, createInitialMailbox]);

  // Action: Delete Email
  const deleteEmail = useCallback(
    async (msgId: string) => {
      if (!mailbox) return;
      setEmails((prev) => prev.filter((m) => m.id !== msgId));
      sounds.playTap();
      try {
        await api.deleteEmail(mailbox.id, msgId);
      } catch (err) {
        console.error('[useMailbox] Delete email error:', err);
      }
    },
    [mailbox]
  );

  // Action: Delete Webhook
  const deleteWebhook = useCallback(
    async (hookId: string) => {
      if (!mailbox) return;
      setWebhooks((prev) => prev.filter((w) => w.id !== hookId));
      sounds.playTap();
      try {
        await api.deleteWebhook(mailbox.id, hookId);
      } catch (err) {
        console.error('[useMailbox] Delete webhook error:', err);
      }
    },
    [mailbox]
  );

  // Action: Set Mock Webhook Config
  const setResponseConfig = useCallback((config: WebhookResponseConfig) => {
    setMailbox((prev) => (prev ? { ...prev, responseConfig: config } : null));
  }, []);

  // Action: Change Default Domain
  const updateDomain = useCallback((dom: string) => {
    setSelectedDomain(dom);
    localStorage.setItem('tempbox_default_domain', dom);
  }, []);

  // Format countdown string
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const formattedTtl = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const totalTtl = mailbox?.ttlSeconds || 7200;
  const percentRemaining = Math.min(100, Math.max(0, (remainingSeconds / totalTtl) * 100));

  return {
    mailbox,
    allMailboxes: allMailboxes.length > 0 ? allMailboxes : mailbox ? [mailbox] : [],
    emails,
    webhooks,
    isLoading,
    isRefreshing,
    remainingSeconds,
    formattedTtl,
    percentRemaining,
    selectedDomain,
    refresh: () => (activeIdRef.current ? loadData(activeIdRef.current, true) : null),
    generateNew: createInitialMailbox,
    switchMailbox,
    extend,
    purge,
    deleteEmail,
    deleteWebhook,
    setResponseConfig,
    updateDomain
  };
}
