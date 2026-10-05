import React, { useState } from 'react';
import { X, Sliders, Check } from 'lucide-react';
import type { WebhookResponseConfig } from '@tempbox/shared-types';
import { api } from '../lib/api.js';

interface WebhookConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  mailboxId: string;
  initialConfig?: WebhookResponseConfig;
  onSaved: (config: WebhookResponseConfig) => void;
  onHaptic?: (type: 'light' | 'success') => void;
}

const STATUS_CODES = [
  { code: 200, label: '200 OK', color: 'emerald' },
  { code: 201, label: '201 Created', color: 'teal' },
  { code: 400, label: '400 Bad Request', color: 'amber' },
  { code: 404, label: '404 Not Found', color: 'orange' },
  { code: 429, label: '429 Rate Limit', color: 'rose' },
  { code: 500, label: '500 Server Error', color: 'rose' }
];

const DELAYS = [
  { ms: 0, label: '0ms (Instant)' },
  { ms: 500, label: '500ms' },
  { ms: 1500, label: '1.5s' },
  { ms: 3000, label: '3.0s' }
];

export const WebhookConfigModal: React.FC<WebhookConfigModalProps> = ({
  isOpen,
  onClose,
  mailboxId,
  initialConfig,
  onSaved,
  onHaptic
}) => {
  const [statusCode, setStatusCode] = useState(initialConfig?.statusCode || 200);
  const [delayMs, setDelayMs] = useState(initialConfig?.delayMs || 0);
  const [bodyText, setBodyText] = useState(
    initialConfig?.responseBody || JSON.stringify({ success: true, status: 'received' }, null, 2)
  );
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      const config: WebhookResponseConfig = {
        statusCode,
        delayMs,
        contentType: 'application/json',
        responseBody: bodyText
      };

      await api.updateWebhookResponseConfig(mailboxId, config);
      onHaptic?.('success');
      setSavedSuccess(true);
      onSaved(config);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error('Error saving webhook config:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Mock Webhook Response</h2>
            <p className="text-xs text-slate-400">Configure return code and mock body</p>
          </div>
        </div>

        {/* HTTP Status Selector */}
        <div className="space-y-1.5 my-3">
          <label className="text-xs font-semibold text-slate-300">HTTP Status Code</label>
          <div className="grid grid-cols-3 gap-1.5">
            {STATUS_CODES.map((st) => (
              <button
                key={st.code}
                type="button"
                onClick={() => {
                  onHaptic?.('light');
                  setStatusCode(st.code);
                }}
                className={`py-1.5 px-2 rounded-lg font-mono text-xs font-bold border transition-all ${
                  statusCode === st.code
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {st.code}
              </button>
            ))}
          </div>
        </div>

        {/* Artificial Latency Delay */}
        <div className="space-y-1.5 my-3">
          <label className="text-xs font-semibold text-slate-300">Artificial Latency Delay</label>
          <div className="grid grid-cols-4 gap-1.5">
            {DELAYS.map((d) => (
              <button
                key={d.ms}
                type="button"
                onClick={() => {
                  onHaptic?.('light');
                  setDelayMs(d.ms);
                }}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  delayMs === d.ms
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Response Body Editor */}
        <div className="space-y-1.5 my-3">
          <label className="text-xs font-semibold text-slate-300">Custom Response Body (JSON)</label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-sky-200 outline-none focus:border-emerald-500"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg ${
            savedSuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
          }`}
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>Saved Mock Config!</span>
            </>
          ) : (
            <span>Save Configuration</span>
          )}
        </button>
      </div>
    </div>
  );
};
