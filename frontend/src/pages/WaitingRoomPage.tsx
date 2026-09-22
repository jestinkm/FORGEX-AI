import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Users,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  LogOut,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useQueueStore } from '../store/queueStore';
import { useQueueSocket } from '../hooks/useQueueSocket';
import { queueApi } from '../api/endpoints';

export const WaitingRoomPage: React.FC = () => {
  const { eventId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const {
    queuePosition,
    queueDepth,
    estimatedWaitSeconds,
    status,
    admissionToken,
    clearQueue,
  } = useQueueStore();

  // Socket & Polling fallback hook
  const { connectionStatus } = useQueueSocket({
    eventId,
    onAdmitted: () => {
      // Auto-redirect to checkout page on admission
      navigate(`/checkout/${eventId}`);
    },
  });

  // If already admitted on mount, redirect immediately
  useEffect(() => {
    if (admissionToken && status === 'ADMITTED') {
      navigate(`/checkout/${eventId}`);
    }
  }, [admissionToken, status, eventId, navigate]);

  const handleLeaveQueue = async () => {
    try {
      await queueApi.leave(eventId);
    } catch (e) {
      // Ignore error
    } finally {
      clearQueue();
      navigate('/');
    }
  };

  // Format estimated wait time
  const formatWaitTime = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) return 'Less than 1 minute';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} seconds`;
    return `${mins} min ${secs > 0 ? `${secs}s` : ''}`;
  };

  // Calculate progress percentage (closer to 1 = higher percentage)
  const position = queuePosition ?? 1;
  const depth = Math.max(queueDepth, position);
  const progressPercent = Math.min(100, Math.max(5, Math.round(((depth - position + 1) / depth) * 100)));

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-2xl w-full">
        {/* Main Waiting Room Glass Card */}
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-brand-500/20 shadow-2xl relative overflow-hidden text-center">
          {/* Neon Gradient Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-500 via-surge-cyan to-surge-emerald animate-pulse" />

          {/* Connection Status Indicator Pill */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-medium mb-6">
            {connectionStatus === 'connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-surge-emerald animate-ping" />
                <Wifi className="w-3.5 h-3.5 text-surge-emerald" />
                <span className="text-surge-emerald">Live Queue Sync Active</span>
              </>
            ) : connectionStatus === 'polling' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-surge-cyan animate-pulse" />
                <Wifi className="w-3.5 h-3.5 text-surge-cyan" />
                <span className="text-surge-cyan">Active via Fallback Polling</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-surge-amber animate-pulse" />
                <WifiOff className="w-3.5 h-3.5 text-surge-amber" />
                <span className="text-surge-amber">Reconnecting to Queue...</span>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            You're in the Virtual Waiting Room
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-8">
            Thank you for your patience. To maintain fair access during this flash sale, users are admitted into checkout in controlled batches.
          </p>

          {/* Prominent Live Position Counter */}
          <div className="bg-slate-900/90 border border-brand-500/30 rounded-3xl p-8 mb-8 shadow-inner relative overflow-hidden">
            <div className="text-xs uppercase font-bold tracking-widest text-brand-400 mb-2">
              Your Current Position
            </div>
            <div className="text-6xl sm:text-7xl font-black bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent font-mono tracking-tight">
              #{position.toLocaleString()}
            </div>
            <div className="mt-3 text-xs text-slate-400 flex items-center justify-center space-x-2">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>{depth.toLocaleString()} total fans waiting in line</span>
            </div>
          </div>

          {/* Animated Queue Velocity Progress Bar */}
          <div className="mb-8 text-left">
            <div className="flex justify-between text-xs font-semibold text-slate-400 mb-2">
              <span>Queue Velocity & Movement</span>
              <span className="text-brand-400">{progressPercent}% closer to checkout</span>
            </div>
            <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-brand-600 via-brand-400 to-surge-cyan rounded-full transition-all duration-700 ease-out relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
              </div>
            </div>
          </div>

          {/* Wait Time & Live Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
                <Clock className="w-4 h-4 text-brand-400" />
                <span>Estimated Wait Time</span>
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {formatWaitTime(estimatedWaitSeconds)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
                <ShieldCheck className="w-4 h-4 text-surge-emerald" />
                <span>Queue Protection</span>
              </div>
              <div className="text-sm font-semibold text-slate-200">
                Guaranteed Spot Preserved
              </div>
            </div>
          </div>

          {/* Critical Warning Callout */}
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-surge-amber/30 text-surge-amber text-xs flex items-start space-x-3 text-left mb-8">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Please do not refresh or close this tab!</span>
              <p className="text-slate-300 mt-0.5">
                Refreshing will not move you faster and could cause you to lose your spot. Once admitted, you will be automatically redirected to select tickets.
              </p>
            </div>
          </div>

          {/* Actions: Developer Instant Admission & Leave Queue */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                // Testing helper: instant admission trigger
                useQueueStore.getState().setAdmissionToken(eventId, 'mock-admission-token-for-checkout');
                navigate(`/checkout/${eventId}`);
              }}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center space-x-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-surge-cyan" />
              <span>Simulate Instant Batch Admission</span>
            </button>

            <button
              onClick={handleLeaveQueue}
              className="text-xs text-slate-500 hover:text-rose-400 flex items-center space-x-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Virtual Queue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
