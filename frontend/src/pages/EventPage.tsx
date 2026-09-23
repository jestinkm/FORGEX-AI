import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  Users,
  Ticket,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Film,
  Search,
  CheckCircle2,
  Zap,
} from 'lucide-react';
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
  pricePerSeat: 1.0,
  rateLimitPerMinute: 30,
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
};

// Cinematic poster images mapped to movie keywords with fallback cinema photography
const getMovieImage = (name: string, venue: string, index: number) => {
  const n = (name + ' ' + venue).toLowerCase();
  if (n.includes('avatar')) {
    return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80';
  }
  if (n.includes('arjun')) {
    return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80';
  }
  if (n.includes('coldplay')) {
    return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80';
  }
  if (n.includes('taylor')) {
    return 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80';
  }
  const cinemaFallbacks = [
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=1200&q=80',
  ];
  return cinemaFallbacks[index % cinemaFallbacks.length];
};

export const EventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'CINEMA' | 'CONCERT'>('ALL');
  const [isCaptchaOpen, setIsCaptchaOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { isAuthenticated } = useAuthStore();
  const { setQueueState } = useQueueStore();

  // Fetch all active events from the backend
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getAll,
  });

  // Determine active event from URL parameter, state selection, or first in list
  const activeEvent: EventItem = useMemo(() => {
    if (selectedEventId) {
      const found = events.find((e) => e.id === selectedEventId);
      if (found) return found;
    }
    if (id) {
      const found = events.find((e) => e.id === id);
      if (found) return found;
    }
    return events[0] || DEFAULT_EVENT;
  }, [selectedEventId, id, events]);

  // Live queue depth query for real-time demand indicator
  const { data: queueDepthData } = useQuery({
    queryKey: ['queue-depth', activeEvent.id],
    queryFn: () => adminApi.getQueueDepth(activeEvent.id),
    refetchInterval: 3000,
  });

  const liveWaitingCount = queueDepthData?.queueDepth ?? 14500;

  // Filter events based on search query and category
  const filteredEvents = useMemo(() => {
    return (events.length > 0 ? events : [DEFAULT_EVENT]).filter((e) => {
      const text = (e.name + ' ' + e.venue + ' ' + (e.description || '')).toLowerCase();
      const matchesSearch = text.includes(searchQuery.toLowerCase());
      const isCinema =
        e.venue.toLowerCase().includes('cinema') ||
        e.venue.toLowerCase().includes('inox') ||
        e.venue.toLowerCase().includes('pvr') ||
        e.name.toLowerCase().includes('imax') ||
        e.name.toLowerCase().includes('avatar') ||
        e.name.toLowerCase().includes('arjun') ||
        e.name.toLowerCase().includes('movie');

      if (filterCategory === 'CINEMA') return matchesSearch && isCinema;
      if (filterCategory === 'CONCERT') return matchesSearch && !isCinema;
      return matchesSearch;
    });
  }, [events, searchQuery, filterCategory]);

  const handleSelectEvent = (event: EventItem) => {
    setSelectedEventId(event.id);
    // Smooth scroll down to details/booking section
    const elem = document.getElementById('booking-spotlight');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleJoinClick = (eventToBook?: EventItem) => {
    if (eventToBook) {
      setSelectedEventId(eventToBook.id);
    }
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

  // Dynamic BookMyShow Pricing calculation for selected movie
  const baseCost = Number(activeEvent.pricePerSeat != null && activeEvent.pricePerSeat > 0 ? activeEvent.pricePerSeat : 1.0);
  const reclinerPrice = baseCost <= 5 ? Math.max(2, Math.round(baseCost * 2)) : Math.round(baseCost * 1.8);
  const primePrice = baseCost;
  const classicPrice = baseCost <= 5 ? Math.max(1, Math.round(baseCost)) : Math.max(1, Math.round(baseCost * 0.72));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 flex items-center space-x-3 animate-shake">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 🎬 1. BROWSE ALL MOVIES & SHOWS (BookMyShow Movie Catalog) */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                <Film className="w-3 h-3 text-rose-400" />
                BookMyShow Cinema Hub
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {events.length} Screenings Live
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-2">
              Movies & Live Screenings
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select any movie or event to view cinema hall seating, check live availability, and reserve passes.
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search movie, cinema hall, venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFilterCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  filterCategory === 'ALL'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({events.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('CINEMA')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  filterCategory === 'CINEMA'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Cinemas
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('CONCERT')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  filterCategory === 'CONCERT'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Concerts
              </button>
            </div>
          </div>
        </div>

        {/* MOVIE CATALOG GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredEvents.map((ev, idx) => {
            const isSelected = activeEvent.id === ev.id;
            const posterImg = getMovieImage(ev.name, ev.venue, idx);
            const isCinema =
              ev.venue.toLowerCase().includes('cinema') ||
              ev.venue.toLowerCase().includes('inox') ||
              ev.venue.toLowerCase().includes('pvr') ||
              ev.name.toLowerCase().includes('imax') ||
              ev.name.toLowerCase().includes('avatar') ||
              ev.name.toLowerCase().includes('arjun');

            return (
              <div
                key={ev.id}
                onClick={() => handleSelectEvent(ev)}
                className={`group relative rounded-3xl overflow-hidden bg-slate-900 border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-rose-500 shadow-2xl shadow-rose-500/20 ring-2 ring-rose-500/50 scale-[1.02]'
                    : 'border-slate-800 hover:border-slate-600 hover:scale-[1.01]'
                }`}
              >
                {/* Movie Poster Image with Gradient Overlay */}
                <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-slate-950">
                  <img
                    src={posterImg}
                    alt={ev.name}
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500 opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent"></div>

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-amber-300 border border-amber-500/30">
                      {isCinema ? '🎬 Cinema Release' : '🏟️ Live Stadium'}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500 text-white flex items-center gap-1 shadow-md">
                        <CheckCircle2 className="w-3 h-3" />
                        Selected
                      </span>
                    )}
                  </div>

                  {/* Price Tag Overlay at bottom of poster */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-white px-2.5 py-1 rounded-lg bg-slate-950/90 border border-slate-700/80 backdrop-blur-md flex items-baseline gap-1">
                      <span className="text-emerald-400 font-bold">₹</span>
                      <span className="text-base text-white">
                        {Number(ev.pricePerSeat || 1.0).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">/seat</span>
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-slate-950/80 border border-cyan-500/30">
                      {ev.totalTickets.toLocaleString()} Seats
                    </span>
                  </div>
                </div>

                {/* Movie Info Content */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-white text-base leading-snug group-hover:text-rose-400 transition line-clamp-2">
                      {ev.name}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{ev.venue}</span>
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span>
                        {new Date(ev.startTime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </p>
                  </div>

                  {/* Card Action Button */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinClick(ev);
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-md ${
                        isSelected
                          ? 'bg-[#2dc492] hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-500/25'
                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Book Seats for this Movie' : 'Select & Book Tickets'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 🌟 2. SELECTED MOVIE SPOTLIGHT & HERO SHOWCASE */}
      <section id="booking-spotlight" className="pt-4 space-y-8">
        <div className="relative rounded-3xl overflow-hidden glass-panel border border-slate-800 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-950/95 via-slate-950/85 to-slate-950/90 z-10" />
          <div
            className="absolute inset-0 opacity-40 bg-cover bg-center transition-all duration-700"
            style={{
              backgroundImage: `url("${getMovieImage(activeEvent.name, activeEvent.venue, 0)}")`,
            }}
          />

          <div className="relative z-20 p-8 sm:p-12 lg:p-16 max-w-3xl">
            {/* Live Demand Indicator Badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-surge-rose/10 border border-surge-rose/30 text-surge-rose text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-surge-rose animate-ping" />
              <Users className="w-3.5 h-3.5" />
              <span>Virtual Waiting Room Live: {liveWaitingCount.toLocaleString()} in line</span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold font-mono">
                Now Selected
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {activeEvent.id}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
              {activeEvent.name}
            </h2>

            <p className="text-sm sm:text-base text-slate-300 mb-6 leading-relaxed">
              {activeEvent.description || 'Cinema & Theatre Screening with Dolby Atmos & Curved Projection.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-xs text-slate-300">
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <Calendar className="w-4 h-4 text-brand-400" />
                <span>
                  {new Date(activeEvent.startTime).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <MapPin className="w-4 h-4 text-surge-cyan" />
                <span className="truncate">{activeEvent.venue}</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={() => handleJoinClick(activeEvent)}
                disabled={isJoining}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-sm sm:text-base bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white shadow-xl shadow-rose-500/25 flex items-center justify-center space-x-3 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
              >
                <Ticket className="w-5 h-5" />
                <span>
                  {isJoining
                    ? 'Securing Waiting Room Position...'
                    : `Enter Waiting Room for ${activeEvent.name}`}
                </span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Bot shield & Rate-limit protected ({activeEvent.rateLimitPerMinute || 30} req/min)
              </span>
            </div>
          </div>
        </div>

        {/* 🎟️ 3. BOOKMYSHOW CINEMA TIERS & PRICING FOR THIS MOVIE */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-xl font-bold text-white">
              BookMyShow Cinema Tiers for &ldquo;{activeEvent.name}&rdquo;
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Classic Silver */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-colors bg-slate-900/60">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-emerald-400 uppercase tracking-wider">
                  🎟️ Classic Silver
                </span>
                <span className="text-[10px] font-mono text-slate-500">Rows F &bull; G &bull; H</span>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl lg:text-3xl font-black text-white font-mono">
                  ₹{classicPrice.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400">/ seat</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Front & screen-adjacent viewing. Dual aisles for convenient theater access.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-emerald-400 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Available for Live Reservation</span>
              </div>
            </div>

            {/* 2. Prime Class (Executive) */}
            <div className="glass-card p-6 rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-cyan-950/20 to-slate-900/80 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider">
                Sweet Spot
              </div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-cyan-300 uppercase tracking-wider">
                  💎 Prime Class (Executive)
                </span>
                <span className="text-[10px] font-mono text-slate-500">Rows C &bull; D &bull; E</span>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl lg:text-3xl font-black text-white font-mono">
                  ₹{primePrice.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400">/ seat</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Optimal cinema acoustic and visual sweet spot. Dolby Atmos surround audio.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-cyan-400 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>High Demand Booking</span>
              </div>
            </div>

            {/* 3. Recliner (VIP Lounge) */}
            <div className="glass-card p-6 rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-slate-900/80 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider">
                Luxury VIP
              </div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-amber-300 uppercase tracking-wider">
                  🌟 Recliner (VIP Lounge)
                </span>
                <span className="text-[10px] font-mono text-slate-500">Rows A &bull; B</span>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl lg:text-3xl font-black text-white font-mono">
                  ₹{reclinerPrice.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400">/ seat</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Plush leather motorized recliners with leg rests and exclusive lounge spacing.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-amber-400 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Limited VIP Inventory</span>
              </div>
            </div>
          </div>
        </div>
      </section>

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

export default EventPage;

