import React, { useEffect, useState } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

interface HoldCountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
}

export const HoldCountdownTimer: React.FC<HoldCountdownTimerProps> = ({ expiresAt, onExpire }) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    return diff;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Dynamic visual styling based on urgency
  const isCritical = secondsRemaining <= 120; // less than 2 mins
  const isWarning = secondsRemaining > 120 && secondsRemaining <= 300; // 2 to 5 mins

  return (
    <div
      className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl border transition-all ${
        isCritical
          ? 'bg-rose-950/40 border-surge-rose/50 text-surge-rose animate-pulse'
          : isWarning
          ? 'bg-amber-950/40 border-surge-amber/50 text-surge-amber'
          : 'bg-emerald-950/30 border-surge-emerald/40 text-surge-emerald'
      }`}
    >
      {isCritical ? (
        <AlertTriangle className="w-4 h-4 animate-bounce" />
      ) : (
        <Timer className="w-4 h-4" />
      )}
      <div className="text-xs font-medium">
        <span className="opacity-80">Hold expires in: </span>
        <span className="font-mono font-bold text-sm tracking-wider">{formattedTime}</span>
      </div>
    </div>
  );
};
