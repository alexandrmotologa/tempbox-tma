import { useState, useEffect, useMemo } from 'react';
import { Mail, Webhook, Beaker, Inbox, Sparkles, Search, X, Sliders, Download, Key, Paperclip } from 'lucide-react';
import type { EmailMessage, WebhookRequest } from '@tempbox/shared-types';
import { useTelegram } from './hooks/useTelegram.js';
import { useMailbox } from './hooks/useMailbox.js';
import { MailboxHeader } from './components/MailboxHeader.js';
import { EmailCard } from './components/EmailCard.js';
import { EmailViewer } from './components/EmailViewer.js';
import { WebhookCard } from './components/WebhookCard.js';
import { WebhookViewer } from './components/WebhookViewer.js';
import { CustomAliasModal } from './components/CustomAliasModal.js';
import { SimulatorModal } from './components/SimulatorModal.js';
import { QrCodeModal } from './components/QrCodeModal.js';
import { MultiMailboxDrawer } from './components/MultiMailboxDrawer.js';
import { WebhookConfigModal } from './components/WebhookConfigModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { sounds } from './lib/sounds.js';
import { api } from './lib/api.js';

export function App() {
  const { user, triggerHaptic, tg } = useTelegram();
  const {
    mailbox,
    allMailboxes,
    emails,
    webhooks,
    isLoading,
    isRefreshing,
    formattedTtl,
    percentRemaining,
    selectedDomain,
    refresh,
    generateNew,
    switchMailbox,
    extend,
    purge,
    deleteEmail,
    deleteWebhook,
    setResponseConfig,
    updateDomain
  } = useMailbox(user?.id);

  const [activeTab, setActiveTab] = useState<'emails' | 'webhooks' | 'simulator'>('emails');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookRequest | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [emailFilter, setEmailFilter] = useState<'all' | 'otp' | 'unread' | 'attachments'>('all');

  // Modals
  const [isAliasModalOpen, setIsAliasModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isMailboxDrawerOpen, setIsMailboxDrawerOpen] = useState(false);
  const [isWebhookConfigOpen, setIsWebhookConfigOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync Telegram BackButton with drill-down views
  useEffect(() => {
    if (!tg?.BackButton) return;

    if (selectedEmail || selectedWebhook) {
      tg.BackButton.show();
      const onBack = () => {
        setSelectedEmail(null);
        setSelectedWebhook(null);
      };
      tg.BackButton.onClick(onBack);
      return () => {
        tg.BackButton.offClick(onBack);
        tg.BackButton.hide();
      };
    } else {
      tg.BackButton.hide();
    }
  }, [selectedEmail, selectedWebhook, tg]);

  // Handle deep-linking from Telegram startapp param
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email') || urlParams.get('startapp');
    const webhookParam = urlParams.get('webhook');

    if (emailParam && emails.length > 0) {
      const found = emails.find((e) => e.id === emailParam);
      if (found) setSelectedEmail(found);
    }

    if (webhookParam && webhooks.length > 0) {
      const found = webhooks.find((w) => w.id === webhookParam);
      if (found) {
        setActiveTab('webhooks');
        setSelectedWebhook(found);
      }
    }
  }, [emails, webhooks]);

  // Zero-trace auto-purge on exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      const shouldPurge = localStorage.getItem('tempbox_autopurge_exit') === 'true';
      if (shouldPurge && mailbox?.id) {
        navigator.sendBeacon(`/api/mailboxes/${mailbox.id}`);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [mailbox?.id]);

  // Filtered emails
  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      // Filter criteria
      if (emailFilter === 'otp' && !email.extractedOtp && !email.extractedMagicLink) return false;
      if (emailFilter === 'unread' && email.isRead) return false;
      if (emailFilter === 'attachments' && (!email.attachments || email.attachments.length === 0)) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inSubject = email.subject.toLowerCase().includes(q);
      const inFrom = email.from.address.toLowerCase().includes(q) || (email.from.name || '').toLowerCase().includes(q);
      const inText = (email.text || '').toLowerCase().includes(q);
      const inOtp = email.extractedOtp?.code.toLowerCase().includes(q);
      const inMagic = email.extractedMagicLink?.url.toLowerCase().includes(q);

      return inSubject || inFrom || inText || inOtp || inMagic;
    });
  }, [emails, emailFilter, searchQuery]);

  // Filtered webhooks
  const filteredWebhooks = useMemo(() => {
    if (!searchQuery.trim()) return webhooks;
    const q = searchQuery.toLowerCase();
    return webhooks.filter((hook) => {
      const inMethod = hook.method.toLowerCase().includes(q);
      const inPath = hook.path.toLowerCase().includes(q);
      const inBody = (hook.rawBody || '').toLowerCase().includes(q);
      return inMethod || inPath || inBody;
    });
  }, [webhooks, searchQuery]);

  // Selected Email View
  if (selectedEmail) {
    return (
      <EmailViewer
        email={selectedEmail}
        onBack={() => setSelectedEmail(null)}
        onDelete={(id) => {
          deleteEmail(id);
          setSelectedEmail(null);
        }}
        onHaptic={triggerHaptic}
      />
    );
  }

  // Selected Webhook View
  if (selectedWebhook) {
    return (
      <>
        <WebhookViewer
          webhook={selectedWebhook}
          onBack={() => setSelectedWebhook(null)}
          onDelete={(id) => {
            deleteWebhook(id);
            setSelectedWebhook(null);
          }}
          onOpenMockConfig={() => setIsWebhookConfigOpen(true)}
          onExportJson={() => {
            if (mailbox) {
              window.open(api.getExportUrl(mailbox.id), '_blank');
            }
          }}
          onHaptic={triggerHaptic}
        />
        {mailbox && (
          <WebhookConfigModal
            isOpen={isWebhookConfigOpen}
            onClose={() => setIsWebhookConfigOpen(false)}
            mailboxId={mailbox.id}
            initialConfig={mailbox.responseConfig}
            onSaved={(cfg) => setResponseConfig(cfg)}
            onHaptic={triggerHaptic}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 max-w-xl mx-auto shadow-2xl relative border-x border-slate-900/60">
      {/* Mailbox Header: Address, Countdown & Quick actions */}
      <MailboxHeader
        mailbox={mailbox}
        mailboxCount={allMailboxes.length}
        activeTab={activeTab}
        formattedTtl={formattedTtl}
        percentRemaining={percentRemaining}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        onGenerateNew={() => generateNew(undefined, selectedDomain)}
        onOpenCustomAlias={() => setIsAliasModalOpen(true)}
        onOpenMailboxSwitcher={() => setIsMailboxDrawerOpen(true)}
        onOpenQrCode={() => setIsQrModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExtend={extend}
        onPurge={purge}
        onHaptic={triggerHaptic}
      />

      {/* Segmented Tab Navigation */}
      <div className="px-3 sm:px-4 py-2 bg-slate-900/70 border-b border-slate-800/80 sticky top-[138px] z-10 backdrop-blur">
        <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('emails');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'emails'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Emails</span>
            {emails.length > 0 && (
              <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-bold">
                {emails.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('webhooks');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'webhooks'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>Webhooks</span>
            {webhooks.length > 0 && (
              <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-bold">
                {webhooks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('simulator');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'simulator'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Beaker className="w-3.5 h-3.5" />
            <span>Test Lab</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar (when in emails or webhooks tabs) */}
      {activeTab !== 'simulator' && (
        <div className="px-3 sm:px-4 pt-2.5 pb-2 bg-slate-950/90 border-b border-slate-800/60 space-y-2">
          {/* Search Input */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'emails'
                  ? 'Search by sender, subject, OTP code...'
                  : 'Search by method, path, payload body...'
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/60 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-0.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tab Specific Filter Chips & Quick Actions */}
          {activeTab === 'emails' ? (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
              <button
                onClick={() => {
                  sounds.playTap();
                  setEmailFilter('all');
                }}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  emailFilter === 'all'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                All ({emails.length})
              </button>

              <button
                onClick={() => {
                  sounds.playTap();
                  setEmailFilter('otp');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  emailFilter === 'otp'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                <Key className="w-3 h-3 text-amber-400" />
                <span>OTP & Links</span>
              </button>

              <button
                onClick={() => {
                  sounds.playTap();
                  setEmailFilter('unread');
                }}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  emailFilter === 'unread'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                Unread
              </button>

              <button
                onClick={() => {
                  sounds.playTap();
                  setEmailFilter('attachments');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  emailFilter === 'attachments'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                <Paperclip className="w-3 h-3 text-indigo-400" />
                <span>With Files</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 text-xs pt-0.5">
              <button
                onClick={() => {
                  sounds.playTap();
                  triggerHaptic('light');
                  setIsWebhookConfigOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-medium transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configure Mock Response</span>
              </button>

              {mailbox && (
                <button
                  onClick={() => {
                    sounds.playTap();
                    triggerHaptic('light');
                    window.open(api.getExportUrl(mailbox.id), '_blank');
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg text-[11px] transition-colors"
                  title="Export all captured webhooks & emails to JSON"
                >
                  <Download className="w-3 h-3 text-sky-400" />
                  <span>Dump JSON</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-4 pb-16 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs">Connecting to disposable inbox...</p>
          </div>
        ) : activeTab === 'emails' ? (
          filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
                <Inbox className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">
                {searchQuery || emailFilter !== 'all' ? 'No Matching Messages' : 'Inbox is empty'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                {searchQuery || emailFilter !== 'all'
                  ? 'Try clearing your search query or reset filter chips.'
                  : 'Messages sent to your disposable address will appear here automatically.'}
              </p>
              {searchQuery || emailFilter !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setEmailFilter('all');
                  }}
                  className="mt-4 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  Reset Filters
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('simulator')}
                  className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-all active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simulate a Test Verification Email</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredEmails.map((email) => (
                <EmailCard
                  key={email.id}
                  email={email}
                  onClick={() => setSelectedEmail(email)}
                  onDelete={deleteEmail}
                  onHaptic={triggerHaptic}
                />
              ))}
            </div>
          )
        ) : activeTab === 'webhooks' ? (
          filteredWebhooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
                <Webhook className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">
                {searchQuery ? 'No Matching Webhook Requests' : 'No Webhook Requests Yet'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                {searchQuery
                  ? 'No webhooks matched your search query.'
                  : 'Send POST, GET, or JSON requests to your endpoint URL above to inspect payloads.'}
              </p>
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  Clear Search
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('simulator')}
                  className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simulate a Webhook Event</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredWebhooks.map((webhook) => (
                <WebhookCard
                  key={webhook.id}
                  webhook={webhook}
                  onClick={() => setSelectedWebhook(webhook)}
                  onDelete={deleteWebhook}
                  onHaptic={triggerHaptic}
                />
              ))}
            </div>
          )
        ) : (
          <SimulatorModal
            mailboxId={mailbox?.id || ''}
            onEventSimulated={refresh}
            onHaptic={triggerHaptic}
          />
        )}
      </main>

      {/* QR Code Modal */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title={activeTab === 'webhooks' ? 'Webhook Endpoint' : 'Disposable Email'}
        value={mailbox ? (activeTab === 'webhooks' ? mailbox.webhookUrl : mailbox.address) : ''}
        onHaptic={triggerHaptic}
      />

      {/* Multi-Mailbox Drawer */}
      <MultiMailboxDrawer
        isOpen={isMailboxDrawerOpen}
        onClose={() => setIsMailboxDrawerOpen(false)}
        mailboxes={allMailboxes}
        activeMailboxId={mailbox?.id || ''}
        onSelect={(id) => switchMailbox(id)}
        onAddNew={() => generateNew(undefined, selectedDomain)}
        onHaptic={triggerHaptic}
      />

      {/* Mock Webhook Response Config Modal */}
      {mailbox && (
        <WebhookConfigModal
          isOpen={isWebhookConfigOpen}
          onClose={() => setIsWebhookConfigOpen(false)}
          mailboxId={mailbox.id}
          initialConfig={mailbox.responseConfig}
          onSaved={(cfg) => setResponseConfig(cfg)}
          onHaptic={triggerHaptic}
        />
      )}

      {/* Preferences & Privacy Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedDomain={selectedDomain}
        onDomainChange={(d) => updateDomain(d)}
        onHaptic={triggerHaptic}
      />

      {/* Custom Alias Modal */}
      <CustomAliasModal
        isOpen={isAliasModalOpen}
        onClose={() => setIsAliasModalOpen(false)}
        onSubmit={async (alias) => {
          await generateNew(alias, selectedDomain);
        }}
        domain={selectedDomain}
      />
    </div>
  );
}
