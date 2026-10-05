import React from 'react';
import { X, Check, Plus, Mailbox as MailboxIcon, Clock } from 'lucide-react';
import type { Mailbox } from '@tempbox/shared-types';

interface MultiMailboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mailboxes: Mailbox[];
  activeMailboxId: string;
  onSelect: (mailboxId: string) => void;
  onAddNew: () => void;
  onHaptic?: (type: 'light' | 'selection') => void;
}

export const MultiMailboxDrawer: React.FC<MultiMailboxDrawerProps> = ({
  isOpen,
  onClose,
  mailboxes,
  activeMailboxId,
  onSelect,
  onAddNew,
  onHaptic
}) => {
  if (!isOpen) return null;

  const formatRemaining = (expiresAt: number) => {
    const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    const mins = Math.floor(diff / 60);
    if (mins > 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${mins}m left`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-5 shadow-2xl relative max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <MailboxIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Active Inboxes</h2>
              <p className="text-[11px] text-slate-400">Switch between your disposable addresses</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mailbox List */}
        <div className="space-y-2 py-3 overflow-y-auto flex-1">
          {mailboxes.map((mb) => {
            const isActive = mb.id === activeMailboxId;
            return (
              <div
                key={mb.id}
                onClick={() => {
                  onHaptic?.('selection');
                  onSelect(mb.id);
                  onClose();
                }}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all active:scale-98 ${
                  isActive
                    ? 'bg-sky-500/15 border-sky-500/50 shadow-sm'
                    : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-950 hover:border-slate-700'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                      {mb.address}
                    </span>
                    {isActive && (
                      <span className="px-1.5 py-0.2 bg-sky-500 text-white rounded text-[10px] font-bold">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{formatRemaining(mb.expiresAt)}</span>
                  </div>
                </div>

                <div className="shrink-0">
                  {isActive ? (
                    <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-slate-700 bg-slate-850" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Mailbox Button */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={() => {
              onHaptic?.('light');
              onAddNew();
              onClose();
            }}
            disabled={mailboxes.length >= 5}
            className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>
              {mailboxes.length >= 5 ? 'Max 5 inboxes reached' : 'Create New Disposable Inbox'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
