import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, RefreshCw } from 'lucide-react';
import { useQueueStore } from '../store/queueStore';

export const AdmissionExpiredModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { eventId, clearQueue } = useQueueStore();

  useEffect(() => {
    const handleExpired = () => {
      setIsOpen(true);
    };

    window.addEventListener('app:admission-expired', handleExpired);
    return () => window.removeEventListener('app:admission-expired', handleExpired);
  }, []);

  if (!isOpen) return null;

  const handleRejoin = () => {
    clearQueue();
    setIsOpen(false);
    navigate(eventId ? `/events/${eventId}` : '/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-md w-full border border-surge-rose/30 text-center shadow-2xl">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-surge-rose/10 border border-surge-rose/30 flex items-center justify-center text-surge-rose">
          <Clock className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-white mb-2">Session Expired</h3>
        <p className="text-sm text-slate-300 mb-6">
          Your waiting room admission window or ticket hold time (10 minutes) has expired. Held tickets have been released back to available inventory.
        </p>

        <button
          onClick={handleRejoin}
          className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Rejoin Waiting Room</span>
        </button>
      </div>
    </div>
  );
};
