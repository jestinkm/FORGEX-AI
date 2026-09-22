import React, { useEffect, useState } from 'react';
import { Hourglass, ShieldAlert } from 'lucide-react';

export const RateLimitModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleRateLimit = (e: Event) => {
      const customEvent = e as CustomEvent<{ retryAfter: number; message: string }>;
      setMessage(customEvent.detail.message || 'Too many requests received.');
      setSecondsRemaining(customEvent.detail.retryAfter || 2);
      setIsOpen(true);
    };

    window.addEventListener('app:rate-limited', handleRateLimit);
    return () => window.removeEventListener('app:rate-limited', handleRateLimit);
  }, []);

  useEffect(() => {
    if (!isOpen || secondsRemaining <= 0) {
      if (isOpen && secondsRemaining <= 0) {
        setIsOpen(false);
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, secondsRemaining]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-md w-full border border-surge-amber/30 text-center shadow-2xl shadow-surge-amber/10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-surge-amber/10 border border-surge-amber/30 flex items-center justify-center text-surge-amber animate-pulse">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-white mb-2">High Traffic Cooldown</h3>
        <p className="text-sm text-slate-300 mb-6">
          {message} To ensure fair access during this flash sale, please wait a moment.
        </p>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center space-x-2 text-surge-amber font-mono text-2xl font-bold">
            <Hourglass className="w-5 h-5 animate-spin" />
            <span>00:0{secondsRemaining}s</span>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Cooldown in progress...</span>
        </div>

        <button
          disabled={secondsRemaining > 0}
          onClick={() => setIsOpen(false)}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
            secondsRemaining > 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/25'
          }`}
        >
          {secondsRemaining > 0 ? 'Please wait...' : 'Resume Booking'}
        </button>
      </div>
    </div>
  );
};
