import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Link2, ShieldCheck } from 'lucide-react';
import type { ExtractedMagicLink } from '@tempbox/shared-types';

interface MagicLinkPillProps {
  magicLink: ExtractedMagicLink;
  onCopy?: (url: string) => void;
  onOpen?: (url: string) => void;
}

export const MagicLinkPill: React.FC<MagicLinkPillProps> = ({
  magicLink,
  onCopy,
  onOpen
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(magicLink.url);
    setCopied(true);
    onCopy?.(magicLink.url);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(magicLink.url);
    } else {
      window.open(magicLink.url, '_blank', 'noopener,noreferrer');
    }
    onOpen?.(magicLink.url);
  };

  return (
    <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/15 border border-emerald-500/40 rounded-xl p-4 my-3 text-center shadow-lg shadow-emerald-500/5">
      <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Verification & Sign-in Link</span>
      </div>

      <div className="text-sm font-bold text-slate-100 my-1 flex items-center justify-center gap-1.5">
        <Link2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="truncate max-w-xs">{magicLink.label || 'Confirm Account'}</span>
      </div>

      <div className="inline-block px-2.5 py-0.5 bg-black/40 rounded-full font-mono text-[11px] text-emerald-300 border border-emerald-500/30 my-1 truncate max-w-[280px]">
        {magicLink.domain}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={handleOpen}
          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-emerald-600/30"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open Link</span>
        </button>

        <button
          onClick={handleCopy}
          className={`py-2.5 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
            copied
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Link'}</span>
        </button>
      </div>

      <p className="text-[10px] text-slate-400 mt-2">
        Tracking redirects bypassed. Safely copy or open the direct activation URL.
      </p>
    </div>
  );
};
