import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface CustomAliasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (alias: string) => Promise<void>;
  domain: string;
}

export const CustomAliasModal: React.FC<CustomAliasModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  domain
}) => {
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = alias.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!clean) {
      setError('Please enter a valid prefix (letters, numbers, underscores)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(clean);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create mailbox with custom alias');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Custom Mailbox Alias</h2>
            <p className="text-xs text-slate-400">Choose your custom inbox prefix</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Prefix
            </label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus-within:border-indigo-500">
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="my_custom_inbox"
                className="bg-transparent text-slate-100 outline-none w-full font-mono text-sm placeholder:text-slate-600"
                autoFocus
              />
              <span className="text-slate-500 font-mono text-xs shrink-0 select-none">
                @{domain}
              </span>
            </div>
            {error && <p className="text-xs text-rose-400 mt-1.5">{error}</p>}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20"
            >
              {loading ? 'Creating...' : 'Create Inbox'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
