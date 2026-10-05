import React, { useState } from 'react';
import { ArrowLeft, Trash2, Paperclip, ShieldCheck, ShieldAlert, Code, FileText, Layout } from 'lucide-react';
import type { EmailMessage } from '@tempbox/shared-types';
import { OtpPill } from './OtpPill.js';

interface EmailViewerProps {
  email: EmailMessage;
  onBack: () => void;
  onDelete: (id: string) => void;
  onHaptic?: (type: 'light' | 'medium') => void;
}

export const EmailViewer: React.FC<EmailViewerProps> = ({ email, onBack, onDelete, onHaptic }) => {
  const [viewMode, setViewMode] = useState<'html' | 'text' | 'headers'>('html');

  const sender = email.from.name ? `${email.from.name} <${email.from.address}>` : email.from.address;

  // Prepare safe sandbox HTML content with basic styling reset
  const sandboxedHtmlDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 16px;
            color: #1e293b;
            background: #ffffff;
            line-height: 1.5;
            word-wrap: break-word;
          }
          img { max-width: 100%; height: auto; }
          a { color: #0284c7; text-decoration: underline; }
          table { max-width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body>
        ${email.html || `<pre style="white-space: pre-wrap; font-family: inherit;">${email.text || ''}</pre>`}
      </body>
    </html>
  `;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10 backdrop-blur">
        <button
          onClick={() => {
            onHaptic?.('light');
            onBack();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inbox</span>
        </button>

        <button
          onClick={() => {
            onHaptic?.('medium');
            if (window.confirm('Delete this email?')) {
              onDelete(email.id);
              onBack();
            }
          }}
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          title="Delete message"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto pb-12">
        {/* Subject & Meta Header */}
        <div>
          <h1 className="text-lg font-bold text-slate-100 leading-snug">{email.subject}</h1>

          <div className="mt-2 text-xs text-slate-400 space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
            <div>
              <span className="font-semibold text-slate-300">From:</span> {sender}
            </div>
            <div>
              <span className="font-semibold text-slate-300">To:</span> {email.to.join(', ')}
            </div>
            <div>
              <span className="font-semibold text-slate-300">Received:</span>{' '}
              {new Date(email.receivedAt).toLocaleString()}
            </div>

            {/* Auth badges (SPF / DKIM / DMARC) */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
              <span className="text-[11px] text-slate-400 font-medium">Authentication:</span>
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                  email.spf === 'pass'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {email.spf === 'pass' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                SPF: {email.spf || 'none'}
              </span>

              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                  email.dkim === 'pass'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                DKIM: {email.dkim || 'none'}
              </span>
            </div>
          </div>
        </div>

        {/* 1-Tap OTP code card if available */}
        {email.extractedOtp && (
          <OtpPill
            otp={email.extractedOtp}
            onCopy={() => onHaptic?.('medium')}
          />
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('html')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition-colors ${
              viewMode === 'html' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Formatted HTML</span>
          </button>

          <button
            onClick={() => setViewMode('text')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition-colors ${
              viewMode === 'text' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Plain Text</span>
          </button>

          <button
            onClick={() => setViewMode('headers')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition-colors ${
              viewMode === 'headers' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Headers</span>
          </button>
        </div>

        {/* Content Renderers */}
        {viewMode === 'html' && (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-white shadow-inner">
            <iframe
              title="Email Content"
              srcDoc={sandboxedHtmlDoc}
              sandbox="allow-popups"
              className="w-full min-h-[420px] border-none"
            />
          </div>
        )}

        {viewMode === 'text' && (
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
            {email.text || 'No plain text version available.'}
          </div>
        )}

        {viewMode === 'headers' && (
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <tbody>
                {Object.entries(email.headers).map(([key, val]) => (
                  <tr key={key} className="border-b border-slate-800/80">
                    <td className="py-1.5 pr-3 text-sky-400 font-semibold align-top">{key}:</td>
                    <td className="py-1.5 text-slate-300 break-all">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Attachments Section */}
        {email.attachments.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-sky-400" />
              <span>Attachments ({email.attachments.length})</span>
            </div>

            <div className="space-y-1.5">
              {email.attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-slate-950 rounded-lg text-xs border border-slate-800/60"
                >
                  <span className="font-mono text-slate-300 truncate mr-2">{att.filename}</span>
                  <span className="text-slate-500 font-mono shrink-0">
                    {(att.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
