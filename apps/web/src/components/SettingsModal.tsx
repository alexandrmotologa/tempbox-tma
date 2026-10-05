import React, { useState, useEffect } from 'react';
import { X, Settings, Volume2, VolumeX, Shield, Bell, Globe } from 'lucide-react';
import { sounds } from '../lib/sounds.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDomain: string;
  onDomainChange: (domain: string) => void;
  onHaptic?: (type: 'light' | 'success') => void;
}

const AVAILABLE_DOMAINS = [
  'tempbox.dev',
  'inbox.tempbox.dev',
  'mail.tempbox.dev'
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  selectedDomain,
  onDomainChange,
  onHaptic
}) => {
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);
  const [onlyOtpAlerts, setOnlyOtpAlerts] = useState(false);
  const [autoPurgeOnExit, setAutoPurgeOnExit] = useState(false);

  useEffect(() => {
    const savedSound = localStorage.getItem('tempbox_sound_enabled');
    if (savedSound !== null) {
      const val = savedSound === 'true';
      setSoundEnabled(val);
      sounds.enabled = val;
    }

    const savedOtpOnly = localStorage.getItem('tempbox_only_otp_alerts');
    if (savedOtpOnly !== null) {
      setOnlyOtpAlerts(savedOtpOnly === 'true');
    }

    const savedAutoPurge = localStorage.getItem('tempbox_autopurge_exit');
    if (savedAutoPurge !== null) {
      setAutoPurgeOnExit(savedAutoPurge === 'true');
    }
  }, []);

  if (!isOpen) return null;

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
    localStorage.setItem('tempbox_sound_enabled', String(next));
    if (next) sounds.playTap();
    onHaptic?.('light');
  };

  const toggleOtpOnly = () => {
    const next = !onlyOtpAlerts;
    setOnlyOtpAlerts(next);
    localStorage.setItem('tempbox_only_otp_alerts', String(next));
    onHaptic?.('light');
  };

  const toggleAutoPurge = () => {
    const next = !autoPurgeOnExit;
    setAutoPurgeOnExit(next);
    localStorage.setItem('tempbox_autopurge_exit', String(next));
    onHaptic?.('light');
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

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Preferences & Privacy</h2>
            <p className="text-xs text-slate-400">Configure alerts and behavior</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Sound Toggle */}
          <div
            onClick={toggleSound}
            className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-800 rounded-lg text-slate-300">
                {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Tactile Audio Feedback</div>
                <div className="text-[11px] text-slate-500">Play chimes on new mail and copy</div>
              </div>
            </div>

            <div
              className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                soundEnabled ? 'bg-sky-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  soundEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Smart OTP Only Filter */}
          <div
            onClick={toggleOtpOnly}
            className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-800 rounded-lg text-slate-300">
                <Bell className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Filter Marketing Spam</div>
                <div className="text-[11px] text-slate-500">Alert only if OTP or link is present</div>
              </div>
            </div>

            <div
              className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                onlyOtpAlerts ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  onlyOtpAlerts ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Auto-Purge on Exit */}
          <div
            onClick={toggleAutoPurge}
            className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-800 rounded-lg text-slate-300">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Zero-Trace Exit</div>
                <div className="text-[11px] text-slate-500">Burn inbox on window close</div>
              </div>
            </div>

            <div
              className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                autoPurgeOnExit ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  autoPurgeOnExit ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Default Domain Selector */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Default Domain</span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {AVAILABLE_DOMAINS.map((dom) => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => {
                    onDomainChange(dom);
                    onHaptic?.('light');
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-lg font-mono text-xs border transition-colors ${
                    selectedDomain === dom
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  @{dom}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
