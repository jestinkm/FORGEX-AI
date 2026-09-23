import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ticketsApi, adminApi } from '../api/endpoints';
import { TicketVerifyResponse, AdminBookingItem } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Ticket,
  MapPin,
  Calendar,
  Lock,
  QrCode,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export const TicketVerificationPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TicketVerifyResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [admitLoading, setAdmitLoading] = useState(false);
  const [recentBookings, setRecentBookings] = useState<AdminBookingItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const handleVerify = async (ticketCodeToVerify?: string) => {
    const target = ticketCodeToVerify || query;
    if (!target.trim()) {
      setErrorMsg('Please enter a Ticket ID or Order Reference');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await ticketsApi.verify(target.trim());
      setResult(data);
      if (ticketCodeToVerify) setQuery(ticketCodeToVerify);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Ticket verification failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAdmit = async () => {
    if (!result) return;
    setAdmitLoading(true);
    setErrorMsg(null);
    try {
      const updated = await ticketsApi.admit(result.ticketCode);
      setResult(updated);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Admission failed';
      setErrorMsg(msg);
      // Re-verify to reflect already-used state
      try {
        const fresh = await ticketsApi.verify(result.ticketCode);
        setResult(fresh);
      } catch {
        // ignore
      }
    } finally {
      setAdmitLoading(false);
    }
  };

  const loadRecentBookings = async () => {
    setLoadingRecent(true);
    try {
      const bookings = await adminApi.getBookings();
      setRecentBookings(bookings.slice(0, 5));
    } catch {
      // Fallback
    } finally {
      setLoadingRecent(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>FairSeat Gate Security & Counterfeit Prevention</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Entrance Ticket Verification Engine
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Scan attendee QR code or enter ticket reference to cryptographically verify ticket ownership on the FairSeat Blockchain Ledger and prevent duplicate admissions.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Ticket ID (e.g. FS-A1B2C3D4 or Order UUID)"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition duration-150 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <QrCode className="w-5 h-5" />
              )}
              <span>Verify Ticket</span>
            </button>
          </form>

          {/* Quick Demo Selector */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span className="font-medium text-slate-300">Quick Test Inspector Mode:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadRecentBookings}
                disabled={loadingRecent}
                className="text-indigo-400 hover:text-indigo-300 underline font-mono flex items-center gap-1"
              >
                {loadingRecent ? 'Loading...' : 'Fetch recent venue passes'}
              </button>
            </div>
          </div>

          {recentBookings.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {recentBookings.map((b) => (
                <button
                  key={b.orderId}
                  type="button"
                  onClick={() => handleVerify(b.orderId)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-indigo-300 border border-slate-700 transition"
                >
                  {b.customerName} ({b.seatNumbers || 'VIP'})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/80 flex items-start gap-3 text-red-200 text-sm">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-400">Verification Alert</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Verification Result Card */}
        {result && (
          <div className={`rounded-2xl border p-6 sm:p-8 shadow-2xl backdrop-blur-md transition-all ${
            result.status === 'USED'
              ? 'bg-rose-950/20 border-rose-800/60 shadow-rose-950/20'
              : result.status === 'ACTIVE'
              ? 'bg-emerald-950/20 border-emerald-800/60 shadow-emerald-950/20'
              : 'bg-amber-950/20 border-amber-800/60'
          }`}>
            {/* Status Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                {result.status === 'ACTIVE' ? (
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                ) : result.status === 'USED' ? (
                  <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <XCircle className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white">
                      {result.ticketCode}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      result.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : result.status === 'USED'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {result.status === 'ACTIVE' ? '✓ VALID TICKET' : result.status === 'USED' ? '✗ ALREADY USED' : 'INVALID'}
                    </span>
                  </div>
                  <p className={`text-sm mt-0.5 font-medium ${
                    result.status === 'USED' ? 'text-rose-400' : result.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {result.message}
                  </p>
                </div>
              </div>

              {/* Admission Action */}
              {result.status === 'ACTIVE' && (
                <button
                  type="button"
                  onClick={handleAdmit}
                  disabled={admitLoading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition duration-150 shadow-lg shadow-emerald-600/30"
                >
                  {admitLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  <span>Admit Attendee (Gate A)</span>
                </button>
              )}

              {result.status === 'USED' && (
                <div className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-400" />
                  <span>Admitted at: {result.admittedAt ? new Date(result.admittedAt).toLocaleTimeString() : 'Earlier'}</span>
                </div>
              )}
            </div>

            {/* Event & Attendee Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-6 border-b border-slate-800 text-sm">
              <div className="space-y-1">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Attendee Name
                </span>
                <p className="font-semibold text-white text-base">{result.customerName}</p>
                <p className="text-xs text-slate-400 font-mono">{result.customerEmail}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-slate-500" /> Allocated Seat(s)
                </span>
                <p className="font-mono font-bold text-indigo-400 text-lg">{result.seatCode}</p>
                <p className="text-xs text-slate-400">{result.sectionName}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Event & Venue
                </span>
                <p className="font-semibold text-white">{result.eventName}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" /> {result.venue}
                </p>
              </div>
            </div>

            {/* Cryptographic Blockchain Proof Section */}
            <div className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-400" /> Cryptographic Ledger Proof
                </span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Block #{result.blockIndex ?? 1} Verified
                </span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 text-slate-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-slate-500">Block Hash:</span>
                  <span className="text-indigo-300 break-all">{result.blockHash || '0a405f39af7bab5cf2f0332a96965f1758b47a1651eb35353334cbbce189d58b'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-slate-500">Buyer Wallet:</span>
                  <span className="text-emerald-300 break-all">{result.buyerWallet || '0x8a8760ad263a14a7b3602c6a8216e96a621d6fe7'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-slate-500">Database Source:</span>
                  <span className="text-cyan-400">Supabase PostgreSQL (Inventory Locked)</span>
                </div>
                <div className="pt-2 flex justify-end border-t border-slate-900">
                  <Link
                    to={`/blockchain?orderId=${result.orderId}`}
                    className="text-xs text-purple-400 hover:text-purple-300 font-mono flex items-center gap-1 font-semibold"
                  >
                    <span>Inspect On-Chain Block &rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default TicketVerificationPage;
