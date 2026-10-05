import React, { useState } from 'react';
import { Beaker, Send, Mail, Webhook, Check, Sparkles, Link2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { sounds } from '../lib/sounds.js';

interface SimulatorModalProps {
  mailboxId: string;
  onEventSimulated: () => void;
  onHaptic?: (type: 'light' | 'success') => void;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  mailboxId,
  onEventSimulated,
  onHaptic
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSimulateEmail = async (template: 'github_otp' | 'google_security' | 'magic_link') => {
    try {
      sounds.playTap();
      setLoading(template);
      setSuccessMsg(null);
      await api.simulateEmail({
        mailboxId,
        template
      });
      onHaptic?.('success');
      sounds.playNewMessage();
      let label = 'Email simulated!';
      if (template === 'github_otp') label = 'GitHub OTP email simulated!';
      if (template === 'google_security') label = 'Google verification code simulated!';
      if (template === 'magic_link') label = 'Supabase Magic Link simulated!';
      setSuccessMsg(label);
      onEventSimulated();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(null);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const handleSimulateWebhook = async () => {
    try {
      sounds.playTap();
      setLoading('stripe');
      setSuccessMsg(null);
      await api.simulateWebhook({
        mailboxId,
        template: 'stripe_webhook'
      });
      onHaptic?.('success');
      sounds.playNewMessage();
      setSuccessMsg('Stripe payment webhook simulated!');
      onEventSimulated();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(null);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-lg mx-auto">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <Beaker className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Live Test Simulator</h2>
            <p className="text-xs text-slate-400">
              Inject real verification emails and webhooks to test 1-tap OTP copy & alerts
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl my-3">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-2.5 mt-3">
          {/* GitHub OTP simulation */}
          <button
            onClick={() => handleSimulateEmail('github_otp')}
            disabled={!!loading}
            className="w-full flex items-center justify-between p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-all active:scale-99"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-800 rounded-lg text-slate-200">
                <Mail className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  GitHub Verification Email
                </div>
                <div className="text-[11px] text-slate-400">
                  Sends 6-digit OTP code (<code>849201</code>)
                </div>
              </div>
            </div>

            <div className="p-1.5 text-slate-400 hover:text-sky-400">
              {loading === 'github_otp' ? (
                <span className="text-xs text-sky-400 animate-pulse">Sending...</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </div>
          </button>

          {/* Google Verification simulation */}
          <button
            onClick={() => handleSimulateEmail('google_security')}
            disabled={!!loading}
            className="w-full flex items-center justify-between p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-all active:scale-99"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-800 rounded-lg text-slate-200">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Google Security Code
                </div>
                <div className="text-[11px] text-slate-400">
                  Sends G-xxxxxx format code (<code>G-492019</code>)
                </div>
              </div>
            </div>

            <div className="p-1.5 text-slate-400 hover:text-amber-400">
              {loading === 'google_security' ? (
                <span className="text-xs text-amber-400 animate-pulse">Sending...</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </div>
          </button>

          {/* Magic Link simulation */}
          <button
            onClick={() => handleSimulateEmail('magic_link')}
            disabled={!!loading}
            className="w-full flex items-center justify-between p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-all active:scale-99"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-800 rounded-lg text-slate-200">
                <Link2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Supabase Magic Link Email
                </div>
                <div className="text-[11px] text-slate-400">
                  Sends 1-tap direct account activation URL
                </div>
              </div>
            </div>

            <div className="p-1.5 text-slate-400 hover:text-emerald-400">
              {loading === 'magic_link' ? (
                <span className="text-xs text-emerald-400 animate-pulse">Sending...</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </div>
          </button>

          {/* Stripe Webhook simulation */}
          <button
            onClick={handleSimulateWebhook}
            disabled={!!loading}
            className="w-full flex items-center justify-between p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-all active:scale-99"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-800 rounded-lg text-slate-200">
                <Webhook className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Stripe Payment Webhook
                </div>
                <div className="text-[11px] text-slate-400">
                  Sends JSON <code>payment_intent.succeeded</code> event
                </div>
              </div>
            </div>

            <div className="p-1.5 text-slate-400 hover:text-emerald-400">
              {loading === 'stripe' ? (
                <span className="text-xs text-emerald-400 animate-pulse">Ingesting...</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
