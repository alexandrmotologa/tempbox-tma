import { useState, useEffect } from 'react';
import { Mail, Webhook, Beaker, Inbox, Sparkles } from 'lucide-react';
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

export function App() {
  const { user, triggerHaptic, tg } = useTelegram();
  const {
    mailbox,
    emails,
    webhooks,
    isLoading,
    isRefreshing,
    formattedTtl,
    percentRemaining,
    refresh,
    generateNew,
    extend,
    purge,
    deleteEmail,
    deleteWebhook
  } = useMailbox(user?.id);

  const [activeTab, setActiveTab] = useState<'emails' | 'webhooks' | 'simulator'>('emails');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookRequest | null>(null);
  const [isAliasModalOpen, setIsAliasModalOpen] = useState(false);

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
      <WebhookViewer
        webhook={selectedWebhook}
        onBack={() => setSelectedWebhook(null)}
        onDelete={(id) => {
          deleteWebhook(id);
          setSelectedWebhook(null);
        }}
        onHaptic={triggerHaptic}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 max-w-lg mx-auto shadow-2xl relative">
      {/* Mailbox Header: Address, Countdown & Quick actions */}
      <MailboxHeader
        mailbox={mailbox}
        activeTab={activeTab}
        formattedTtl={formattedTtl}
        percentRemaining={percentRemaining}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        onGenerateNew={() => generateNew()}
        onOpenCustomAlias={() => setIsAliasModalOpen(true)}
        onExtend={extend}
        onPurge={purge}
        onHaptic={triggerHaptic}
      />

      {/* Segmented Tab Navigation */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 sticky top-[138px] z-10 backdrop-blur">
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

      {/* Main Content Area */}
      <main className="flex-1 p-4 pb-16 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs">Connecting to disposable inbox...</p>
          </div>
        ) : activeTab === 'emails' ? (
          emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
                <Inbox className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Inbox is empty</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Messages sent to your disposable address will appear here automatically.
              </p>
              <button
                onClick={() => setActiveTab('simulator')}
                className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate a Test Verification Email</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {emails.map((email) => (
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
          webhooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
                <Webhook className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">No Webhook Requests Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Send POST, GET, or JSON requests to your endpoint URL above to inspect payloads.
              </p>
              <button
                onClick={() => setActiveTab('simulator')}
                className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate a Webhook Event</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {webhooks.map((webhook) => (
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

      {/* Custom Alias Modal */}
      <CustomAliasModal
        isOpen={isAliasModalOpen}
        onClose={() => setIsAliasModalOpen(false)}
        onSubmit={async (alias) => {
          await generateNew(alias);
        }}
        domain={mailbox?.domain || 'tempbox.dev'}
      />
    </div>
  );
}
