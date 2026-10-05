import React, { useState } from 'react';
import { Copy, Check, ShieldCheck } from 'lucide-react';
import type { ExtractedOtp } from '@tempbox/shared-types';

interface OtpPillProps {
  otp: ExtractedOtp;
  onCopy?: (code: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const OtpPill: React.FC<OtpPillProps> = ({ otp, onCopy, size = 'lg' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(otp.code);
    setCopied(true);
    onCopy?.(otp.code);
    setTimeout(() => setCopied(false), 2000);
  };

  if (size === 'sm') {
    return (
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md text-xs font-mono font-semibold transition-all active:scale-95"
        title="Tap to copy code"
      >
        <span className="tracking-wider">{otp.code}</span>
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-70" />}
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 border border-amber-500/40 rounded-xl p-4 my-3 text-center shadow-lg shadow-amber-500/5">
      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-amber-300 uppercase tracking-wider mb-2">
        <ShieldCheck className="w-4 h-4 text-amber-400" />
        <span>{otp.label || 'Verification Code'}</span>
      </div>

      <div className="flex items-center justify-center gap-3 my-2">
        <span className="font-mono text-3xl font-extrabold tracking-widest text-amber-300 select-all px-3 py-1 bg-black/30 rounded-lg border border-amber-500/20">
          {otp.code}
        </span>
      </div>

      <button
        onClick={handleCopy}
        className={`w-full mt-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-98 ${
          copied
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
        }`}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            <span>Copied to Clipboard!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>1-Tap Copy Code</span>
          </>
        )}
      </button>

      {otp.contextSnippet && (
        <p className="text-[11px] text-slate-400 mt-2 line-clamp-1 italic">
          &ldquo;{otp.contextSnippet}&rdquo;
        </p>
      )}
    </div>
  );
};
