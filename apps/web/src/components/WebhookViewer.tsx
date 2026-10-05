import React, { useState } from 'react';
import { ArrowLeft, Trash2, Copy, Check, Terminal, Code2, Sliders, Download } from 'lucide-react';
import type { WebhookRequest } from '@tempbox/shared-types';
import { sounds } from '../lib/sounds.js';

interface WebhookViewerProps {
  webhook: WebhookRequest;
  onBack: () => void;
  onDelete: (id: string) => void;
  onOpenMockConfig?: () => void;
  onExportJson?: () => void;
  onHaptic?: (type: 'light' | 'medium' | 'success') => void;
}

export const WebhookViewer: React.FC<WebhookViewerProps> = ({
  webhook,
  onBack,
  onDelete,
  onOpenMockConfig,
  onExportJson,
  onHaptic
}) => {
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const getCurlCommand = () => {
    let curl = `curl -X ${webhook.method} "${webhook.url || 'https://tempbox.dev'}"`;
    for (const [k, v] of Object.entries(webhook.headers)) {
      if (['host', 'content-length'].includes(k.toLowerCase())) continue;
      curl += ` \\\n  -H "${k}: ${v}"`;
    }
    if (webhook.rawBody) {
      curl += ` \\\n  -d '${webhook.rawBody.replace(/'/g, "\\'")}'`;
    }
    return curl;
  };

  const handleCopyBody = () => {
    sounds.playCopySuccess();
    navigator.clipboard.writeText(
      webhook.body ? JSON.stringify(webhook.body, null, 2) : webhook.rawBody
    );
    setCopiedBody(true);
    onHaptic?.('success');
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const handleCopyCurl = () => {
    sounds.playCopySuccess();
    navigator.clipboard.writeText(getCurlCommand());
    setCopiedCurl(true);
    onHaptic?.('success');
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const formattedJson = webhook.body
    ? JSON.stringify(webhook.body, null, 2)
    : webhook.rawBody || '(Empty body)';

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10 backdrop-blur">
        <button
          onClick={() => {
            sounds.playTap();
            onHaptic?.('light');
            onBack();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Webhooks</span>
        </button>

        <div className="flex items-center gap-1.5">
          {onOpenMockConfig && (
            <button
              onClick={() => {
                sounds.playTap();
                onHaptic?.('light');
                onOpenMockConfig();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors"
              title="Configure mock response"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Mock</span>
            </button>
          )}

          {onExportJson && (
            <button
              onClick={() => {
                sounds.playTap();
                onHaptic?.('light');
                onExportJson();
              }}
              className="p-1.5 text-slate-400 hover:text-sky-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/60"
              title="Export JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => {
              onHaptic?.('medium');
              if (window.confirm('Delete this webhook request?')) {
                onDelete(webhook.id);
                onBack();
              }
            }}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Delete webhook"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto pb-12">
        {/* Method & Path Card */}
        <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-md font-mono text-xs font-bold">
              {webhook.method}
            </span>
            <span className="font-mono text-sm font-semibold text-slate-200 break-all">
              {webhook.path}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Captured at {new Date(webhook.receivedAt).toLocaleTimeString()}</span>
            <span className="font-mono text-[11px] text-slate-500">IP: {webhook.ip}</span>
          </div>
        </div>

        {/* Action bar: Copy cURL */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCurl}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
          >
            {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5" />}
            <span>{copiedCurl ? 'cURL Copied!' : 'Copy Replay cURL'}</span>
          </button>
        </div>

        {/* Query Parameters (if any) */}
        {Object.keys(webhook.queryParams).length > 0 && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-3">
            <div className="text-xs font-semibold text-slate-300 mb-2">Query Parameters</div>
            <table className="w-full text-left font-mono text-xs">
              <tbody>
                {Object.entries(webhook.queryParams).map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-800/60">
                    <td className="py-1 text-sky-400 pr-2">{k}:</td>
                    <td className="py-1 text-slate-200">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payload Body */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-850 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Payload Body</span>
            </div>

            <button
              onClick={handleCopyBody}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-sky-300 transition-colors"
            >
              {copiedBody ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedBody ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre className="p-3 font-mono text-xs text-sky-200 overflow-x-auto whitespace-pre leading-relaxed max-h-96">
            {formattedJson}
          </pre>
        </div>

        {/* Request Headers */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-3">
          <div className="text-xs font-semibold text-slate-300 mb-2">Headers ({Object.keys(webhook.headers).length})</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <tbody>
                {Object.entries(webhook.headers).map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-800/60">
                    <td className="py-1 text-slate-400 pr-3 align-top whitespace-nowrap">{k}:</td>
                    <td className="py-1 text-slate-200 break-all">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
