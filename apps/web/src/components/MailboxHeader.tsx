import React, { useState } from 'react';
import {
  Copy,
  Check,
  Clock,
  Plus,
  Flame,
  RefreshCw,
  SlidersHorizontal,
  Webhook,
  QrCode,
  Settings,
  ChevronDown
} from 'lucide-react';
import type { Mailbox } from '@tempbox/shared-types';
import { sounds } from '../lib/sounds.js';

interface MailboxHeaderProps {
  mailbox: Mailbox | null;
  mailboxCount: number;
  activeTab: 'emails' | 'webhooks' | 'simulator';
  formattedTtl: string;
  percentRemaining: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  onGenerateNew: () => void;
  onOpenCustomAlias: () => void;
  onOpenMailboxSwitcher: () => void;
  onOpenQrCode: () => void;
  onOpenSettings: () => void;
  onExtend: () => void;
  onPurge: () => void;
  onHaptic?: (type: 'light' | 'medium' | 'success') => void;
}

export const MailboxHeader: React.FC<MailboxHeaderProps> = ({
  mailbox,
  mailboxCount,
  activeTab,
  formattedTtl,
  percentRemaining,
  isRefreshing,
  onRefresh,
  onGenerateNew,
  onOpenCustomAlias,
  onOpenMailboxSwitcher,
  onOpenQrCode,
  onOpenSettings,
  onExtend,
  onPurge,
  onHaptic
}) => {
  const [copied, setCopied] = useState(false);

  if (!mailbox) return null;

  const currentDisplay = activeTab === 'webhooks' ? mailbox.webhookUrl : mailbox.address;

  const handleCopy = () => {
    sounds.playCopySuccess();
    navigator.clipboard.writeText(currentDisplay);
    setCopied(true);
    onHaptic?.('success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 p-3 sm:p-4 sticky top-0 z-20 backdrop-blur-md">
      {/* Top row: Status, Multi-Inbox Switcher & Actions */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        {/* Left: Switcher trigger */}
        <button
          onClick={() => {
            sounds.playTap();
            onHaptic?.('light');
            onOpenMailboxSwitcher();
          }}
          className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700/60 transition-colors"
          title="Switch mailbox"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-xs">
            {mailboxCount > 1 ? `${mailboxCount} Inboxes` : 'Inbox 1'}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {/* Right: Countdown & Settings */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/50 text-[11px]">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>{formattedTtl}</span>
          </div>

          <button
            onClick={() => {
              sounds.playTap();
              onHaptic?.('light');
              onOpenSettings();
            }}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            title="Settings & Privacy"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Address / Webhook Card */}
      <div className="group relative flex items-center justify-between p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-sky-500/50 rounded-xl transition-all shadow-inner">
        <div
          onClick={handleCopy}
          className="min-w-0 pr-3 flex-1 cursor-pointer"
        >
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5 flex items-center gap-1">
            {activeTab === 'webhooks' ? <Webhook className="w-3 h-3 text-emerald-400" /> : null}
            <span>{activeTab === 'webhooks' ? 'Endpoint URL' : 'Email Address'}</span>
          </div>
          <div className="font-mono text-sm sm:text-base font-semibold text-sky-300 truncate group-hover:text-sky-200">
            {currentDisplay}
          </div>
        </div>

        {/* Actions inside card: QR code & Copy */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              sounds.playTap();
              onHaptic?.('light');
              onOpenQrCode();
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-sky-300 rounded-lg border border-slate-700 transition-colors"
            title="Show QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopy}
            className={`p-2 rounded-lg transition-all ${
              copied
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800 group-hover:bg-sky-500/20 text-slate-400 group-hover:text-sky-300 border border-slate-700'
            }`}
            title="Click to copy"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Lifespan Progress Bar */}
      <div className="w-full bg-slate-800/60 h-1.5 rounded-full mt-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            percentRemaining < 20 ? 'bg-rose-500' : percentRemaining < 50 ? 'bg-amber-500' : 'bg-sky-500'
          }`}
          style={{ width: `${percentRemaining}%` }}
        />
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-1.5 mt-3 pt-1 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              sounds.playTap();
              onHaptic?.('light');
              onGenerateNew();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/60 transition-colors active:scale-95"
            title="Generate random new mailbox"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>New</span>
          </button>

          <button
            onClick={() => {
              sounds.playTap();
              onHaptic?.('light');
              onOpenCustomAlias();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/60 transition-colors active:scale-95"
            title="Custom alias"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Alias</span>
          </button>

          <button
            onClick={() => {
              sounds.playTap();
              onHaptic?.('light');
              onExtend();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/60 transition-colors active:scale-95"
            title="Extend lifespan by 1 hour"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>+1h</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              sounds.playTap();
              onHaptic?.('light');
              onRefresh();
            }}
            disabled={isRefreshing}
            className={`p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700/60 transition-colors active:scale-95 ${
              isRefreshing ? 'animate-spin text-sky-400' : ''
            }`}
            title="Refresh inbox"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              onHaptic?.('medium');
              if (window.confirm('Burn mailbox now? All emails and webhooks will be erased immediately.')) {
                onPurge();
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-lg border border-rose-800/50 transition-colors active:scale-95"
            title="Delete this mailbox immediately"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Purge</span>
          </button>
        </div>
      </div>
    </div>
  );
};
