import React from 'react';
import { Trash2, Paperclip } from 'lucide-react';
import type { EmailMessage } from '@tempbox/shared-types';
import { OtpPill } from './OtpPill.js';

interface EmailCardProps {
  email: EmailMessage;
  onClick: () => void;
  onDelete: (id: string) => void;
  onHaptic?: (type: 'light' | 'medium') => void;
}

export const EmailCard: React.FC<EmailCardProps> = ({ email, onClick, onDelete, onHaptic }) => {
  const senderDisplay = email.from.name || email.from.address;
  const initial = (senderDisplay.charAt(0) || 'E').toUpperCase();

  const formatRelativeTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={onClick}
      className={`group relative p-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl cursor-pointer transition-all active:scale-99 shadow-sm ${
        !email.isRead ? 'border-l-4 border-l-sky-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Left: Avatar + Sender + Subject */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-300 font-bold text-sm shrink-0">
            {initial}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-slate-200 truncate">{senderDisplay}</span>
              {email.attachments.length > 0 && <Paperclip className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
            </div>
            <div className="text-xs font-medium text-slate-300 truncate mt-0.5">{email.subject}</div>
            <div className="text-xs text-slate-500 truncate mt-0.5 line-clamp-1">
              {email.text ? email.text.replace(/\s+/g, ' ').slice(0, 80) : 'HTML message'}
            </div>
          </div>
        </div>

        {/* Right: Timestamp & Delete */}
        <div className="flex flex-col items-end shrink-0 gap-1">
          <span className="text-[11px] text-slate-500 whitespace-nowrap">
            {formatRelativeTime(email.receivedAt)}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onHaptic?.('medium');
              onDelete(email.id);
            }}
            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
            title="Delete email"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Instant 1-tap OTP chip right in the inbox item! */}
      {email.extractedOtp && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
          <span className="text-[11px] text-amber-400/80 font-medium flex items-center gap-1">
            <span>Detected Code:</span>
          </span>
          <OtpPill otp={email.extractedOtp} size="sm" />
        </div>
      )}
    </div>
  );
};
