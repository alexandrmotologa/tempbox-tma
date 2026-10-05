import React, { useEffect, useState } from 'react';
import { X, Copy, Check, Download, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onHaptic?: (type: 'light' | 'success') => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  title,
  value,
  onHaptic
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !value) return;

    QRCode.toDataURL(value, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR:', err));
  }, [isOpen, value]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    onHaptic?.('success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `tempbox-qr-${Date.now()}.png`;
    a.click();
    onHaptic?.('light');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xs p-5 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2">
          <QrCode className="w-4 h-4" />
          <span>{title}</span>
        </div>

        {/* QR Canvas Container */}
        <div className="bg-white p-3 rounded-xl inline-block shadow-inner my-2">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
              Generating...
            </div>
          )}
        </div>

        <div className="font-mono text-xs text-sky-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 my-2 truncate select-all">
          {value}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={handleCopy}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-sky-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
