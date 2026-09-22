import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Users, Ticket, Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';
import { eventsApi, queueApi, adminApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { useQueueStore } from '../store/queueStore';
import { CaptchaModal } from '../components/CaptchaModal';
import { AuthModal } from '../components/AuthModal';
import { EventItem } from '../types';

const DEFAULT_EVENT: EventItem = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Coldplay: Music of the Spheres World Tour 2026',
  description: 'Exclusive stadium flash sale. Max 4 tickets per user. High demand expected.',
  venue: 'Wembley Stadium, London',
  startTime: new Date(Date.now() + 30 * 86400000).toISOString(),
  totalTickets: 50000,
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
};

export const EventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isCaptchaOpen, setIsCaptchaOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { isAuthenticated } = useAuthStore();
  const { setQueueState } = useQueueStore();

  // Fetch all active events or single event
  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getAll,
  });

  // Strict non-null assignment with fallback
  const activeEvent: EventItem = (id ? events?.find((e) => e.id === id) : events?.[0]) ?? DEFAULT_EVENT;

  // Live queue depth query for real-time demand indicator
  const { data: queueDepthData } = useQuery({
    queryKey: ['queue-depth', activeEvent.id],
    queryFn: () => adminApi.getQueueDepth(activeEvent.id),
    refetchInterval: 3000,
  });

  const liveWaitingCount = queueDepthData?.queueDepth ?? 14500;

  const handleJoinClick = () => {
    if (!isAuthenticated) {
      setIsAuthOpen(true);
      return;
    }
    setIsCaptchaOpen(true);
  };

  const handleCaptchaSuccess = async (captchaToken: string) => {
    setIsCaptchaOpen(false);
    setIsJoining(true);
    setErrorMsg(null);

    try {
      const queueRes = await queueApi.join(activeEvent.id, captchaToken);

      setQueueState({
        eventId: activeEvent.id,
        queuePosition: queueRes.queuePosition,
        queueDepth: queueRes.queueDepth,
        estimatedWaitSeconds: queueRes.estimatedWaitSeconds,
        status: queueRes.status === 'ALREADY_ADMITTED' ? 'ADMITTED' : 'WAITING',
        admissionToken: queueRes.admissionToken,
      });

      if (queueRes.status === 'ALREADY_ADMITTED' && queueRes.admissionToken) {
        navigate(`/checkout/${activeEvent.id}`);
      } else {
        navigate(`/waiting-room/${activeEvent.id}`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to enter waiting room. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 flex items-center space-x-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Hero Event Banner Card */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-slate-800 shadow-2xl mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-950/95 via-slate-950/85 to-slate-950/90 z-10" />
        <div
          className="absolute inset-0 opacity-40 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1800&q=80")',
          }}
        />

        <div className="relative z-20 p-8 sm:p-12 lg:p-16 max-w-3xl">
          {/* Live Demand Indicator Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-surge-rose/10 border border-surge-rose/30 text-surge-rose text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-surge-rose animate-ping" />
            <Users className="w-3.5 h-3.5" />
            <span>High Demand: {liveWaitingCount.toLocaleString()} in virtual line</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4">
            {activeEvent.name}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 mb-8 leading-relaxed">
            {activeEvent.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-sm text-slate-300">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <Calendar className="w-5 h-5 text-brand-400" />
              <span>{new Date(activeEvent.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <MapPin className="w-5 h-5 text-surge-cyan" />
              <span>{activeEvent.venue}</span>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleJoinClick}
              disabled={isJoining}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-brand-600 via-brand-500 to-surge-cyan hover:from-brand-500 hover:to-surge-cyan text-white shadow-xl shadow-brand-500/25 flex items-center justify-center space-x-3 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              <Ticket className="w-5 h-5" />
              <span>{isJoining ? 'Securing Queue Spot...' : 'Join Virtual Waiting Room'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-400 font-medium">
              ⚡ Anti-bot verification required before queue entry
            </span>
          </div>
        </div>
      </div>

      {/* Ticket Price Tiers Grid */}
      <div className="mb-12">
        <div className="flex items-center space-x-2 mb-6">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <h2 className="text-2xl font-bold text-white">Ticket Categories & Pricing</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-brand-500/40 transition-colors">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">General Admission</span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">₹1.00</span>
              <span className="text-xs text-slate-400">/ ticket</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">Standard standing & stadium seating. Max 4 tickets per order.</p>
            <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-surge-emerald flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-surge-emerald" />
              <span>Available in Flash Sale</span>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-brand-500/30 bg-gradient-to-b from-brand-950/30 to-slate-900/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-brand-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider">
              Most Popular
            </div>
            <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Floor & Pitch Access</span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">₹2.00</span>
              <span className="text-xs text-slate-400">/ ticket</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">Closest access to the main stage. High concurrency allocation.</p>
            <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-surge-emerald flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-surge-emerald" />
              <span>Available in Flash Sale</span>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-brand-500/40 transition-colors">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">VIP Hospitality Lounge</span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">₹5.00</span>
              <span className="text-xs text-slate-400">/ ticket</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">Early entrance, priority bar access, commemorative laminate pass.</p>
            <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-surge-amber flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-surge-amber" />
              <span>Limited Availability</span>
            </div>
          </div>
        </div>
      </div>

      <CaptchaModal
        isOpen={isCaptchaOpen}
        onClose={() => setIsCaptchaOpen(false)}
        onSuccess={handleCaptchaSuccess}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          if (useAuthStore.getState().isAuthenticated) {
            setIsCaptchaOpen(true);
          }
        }}
      />
    </div>
  );
};
