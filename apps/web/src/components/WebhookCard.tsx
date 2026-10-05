import React from 'react';
import { Trash2, Globe } from 'lucide-react';
import type { WebhookRequest } from '@tempbox/shared-types';

interface WebhookCardProps {
  webhook: WebhookRequest;
  onClick: () => void;
  onDelete: (id: string) => void;
  onHaptic?: (type: 'light' | 'medium') => void;
}

export const WebhookCard: React.FC<WebhookCardProps> = ({ webhook, onClick, onDelete, onHaptic }) => {
  const getMethodBadge = (m: string) => {
    switch (m.toUpperCase()) {
      case 'GET':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'POST':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'PUT':
      case 'PATCH':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'DELETE':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/30';
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div
      onClick={onClick}
      className="group relative p-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl cursor-pointer transition-all active:scale-99 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getMethodBadge(
              webhook.method
            )}`}
          >
            {webhook.method}
          </span>
          <span className="font-mono text-xs text-slate-300 truncate font-semibold">
            {webhook.path || '/'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            {formatRelativeTime(webhook.receivedAt)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHaptic?.('medium');
              onDelete(webhook.id);
            }}
            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
            title="Delete webhook"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-400 font-mono line-clamp-1 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/60">
        {webhook.rawBody ? webhook.rawBody.replace(/\s+/g, ' ') : '(Empty body)'}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1 font-mono">
          <Globe className="w-3 h-3 text-slate-600" />
          {webhook.ip || '127.0.0.1'}
        </span>
        <span>{Object.keys(webhook.headers).length} headers</span>
      </div>
    </div>
  );
};
