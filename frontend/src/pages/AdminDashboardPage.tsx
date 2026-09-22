import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Ticket,
  Clock,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Sparkles,
  Copy,
  Check,
  Building,
  Radio,
  ExternalLink,
  ChevronDown,
  Layers,
  Database,
  IndianRupee,
  Activity,
  UserCheck,
  History,
  ShieldAlert,
} from 'lucide-react';
import { adminApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { AdminBookingItem, AdminInventoryItem, AdminActivityLogItem } from '../types';
import { Link } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'bookings' | 'activities'>('bookings');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedEventId, setSelectedEventId] = useState<string>('ALL');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityActionFilter, setActivityActionFilter] = useState('ALL');
  const [admissionBatchSize, setAdmissionBatchSize] = useState<number>(50);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Fetch Overview (KPI stats, events, recent bookings, recent user activities)
  const {
    data: overview,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: adminApi.getOverview,
    refetchInterval: autoRefresh ? 4000 : false,
  });

  // 2. Tune Admission Rate Mutation
  const tuneMutation = useMutation({
    mutationFn: (newBatch: number) => adminApi.tuneAdmissionRate(newBatch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAdmissionChange = (e: React.FormEvent) => {
    e.preventDefault();
    tuneMutation.mutate(admissionBatchSize);
  };

  const bookings: AdminBookingItem[] = overview?.recentBookings || [];
  const activities: AdminActivityLogItem[] = overview?.recentActivities || [];

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.eventName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesEvent = selectedEventId === 'ALL' || b.eventId === selectedEventId;

    return matchesSearch && matchesStatus && matchesEvent;
  });

  // Filter Activities
  const filteredActivities = activities.filter((a) => {
    const matchesSearch =
      a.userEmail.toLowerCase().includes(activitySearch.toLowerCase()) ||
      a.action.toLowerCase().includes(activitySearch.toLowerCase()) ||
      (a.details && a.details.toLowerCase().includes(activitySearch.toLowerCase()));

    const matchesAction = activityActionFilter === 'ALL' || a.action === activityActionFilter;
    return matchesSearch && matchesAction;
  });

  const totalCapacity = overview?.totalSeats || 0;
  const soldSeats = overview?.soldSeats || 0;
  const heldSeats = overview?.heldSeats || 0;
  const availableSeats = overview?.availableSeats || 0;

  const soldPct = totalCapacity > 0 ? ((soldSeats / totalCapacity) * 100).toFixed(1) : '0';
  const heldPct = totalCapacity > 0 ? ((heldSeats / totalCapacity) * 100).toFixed(1) : '0';
  const availPct = totalCapacity > 0 ? ((availableSeats / totalCapacity) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-rose-500 selection:text-white">
      {/* Top Operations Command Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-30 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 via-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Live Operations
                </span>
                <span className="text-xs text-slate-400 font-mono">D:\mysql\ticketflow_db</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                TicketFlow Command Center
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  v2.5-PROD
                </span>
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Auto-Refresh Switch */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-400 animate-pulse' : ''}`} />
              <span>{autoRefresh ? 'Telemetry Stream ON (4s)' : 'Stream Paused'}</span>
            </button>

            {/* Manual Sync */}
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-rose-400' : ''}`} />
              <span>Sync Ledger</span>
            </button>

            {/* View Buyer Storefront */}
            <Link
              to="/"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition"
            >
              <span>Storefront</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            {/* User Profile */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800 text-xs text-slate-400">
              <span className="hidden sm:inline font-mono">{user?.email}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* System Architecture Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
                Isolated Admin Environment & Audit Trail
              </p>
              <p className="text-sm font-medium text-slate-300">
                Persistent DB: <code className="text-amber-300 font-mono text-xs">D:\mysql\ticketflow_db\ticketflow.mv.db</code> &bull; Tables: <span className="text-emerald-400 font-mono text-xs">orders, payments, user_activity_logs</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>API 8080 HEALTHY</span>
          </div>
        </div>

        {/* 1. KEY PERFORMANCE STAT CARDS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              Live Stadium Seat & Revenue Telemetry
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Events Managed: {overview?.totalEvents || 0}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Total Stadium Seats */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Stadium Capacity</span>
                <Ticket className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-black text-white font-mono tracking-tight">
                {isLoading ? '...' : totalCapacity.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>All Venues Combined</span>
                <span className="text-indigo-400 font-semibold font-mono">100% Total</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500/30"></div>
            </div>

            {/* 2. Confirmed Sold Seats */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Bookings</span>
                <UserCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                {isLoading ? '...' : soldSeats.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Issued Tickets</span>
                <span className="text-emerald-400 font-semibold font-mono">{soldPct}% Filled</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
            </div>

            {/* 3. Held Seats */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Held (In-Cart)</span>
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-black text-amber-400 font-mono tracking-tight">
                {isLoading ? '...' : heldSeats.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>10-Min Payment Lock</span>
                <span className="text-amber-400 font-semibold font-mono">{heldPct}% Pending</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500"></div>
            </div>

            {/* 4. Available Seats */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Remaining Available</span>
                <Layers className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-black text-cyan-300 font-mono tracking-tight">
                {isLoading ? '...' : availableSeats.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Open for Booking</span>
                <span className="text-cyan-400 font-semibold font-mono">{availPct}% Open</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-500"></div>
            </div>

            {/* 5. Total Revenue */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue Collected</span>
                <IndianRupee className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-black text-white font-mono tracking-tight flex items-baseline">
                <span className="text-emerald-400 mr-1 text-xl">₹</span>
                {isLoading
                  ? '...'
                  : (overview?.totalRevenue || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>UPI Direct Settled</span>
                <span className="text-emerald-400 font-semibold font-mono">100% Paid</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
            </div>
          </div>

          {/* Stadium Capacity Utilization Multi-Color Progress Bar */}
          <div className="mt-5 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Stadium Capacity Allocation
              </span>
              <div className="flex items-center space-x-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Sold: {soldSeats.toLocaleString()} ({soldPct}%)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Held: {heldSeats.toLocaleString()} ({heldPct}%)
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                  Available: {availableSeats.toLocaleString()} ({availPct}%)
                </span>
              </div>
            </div>

            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${soldPct}%` }}
                className="bg-emerald-500 transition-all duration-500 relative group"
                title={`Sold: ${soldSeats}`}
              />
              <div
                style={{ width: `${heldPct}%` }}
                className="bg-amber-500 transition-all duration-500 relative group"
                title={`Held: ${heldSeats}`}
              />
              <div
                style={{ width: `${availPct}%` }}
                className="bg-slate-700 transition-all duration-500"
                title={`Available: ${availableSeats}`}
              />
            </div>
          </div>
        </section>

        {/* 2. EVENT INVENTORY FLEET & QUEUE THROTTLE CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Per-Event Breakdown */}
          <section className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <Building className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">Active Event Venues & Seat Inventory</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {overview?.events?.length || 0} Event Active
              </span>
            </div>

            <div className="space-y-3">
              {overview?.events?.map((ev: AdminInventoryItem) => (
                <div
                  key={ev.eventId}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                        {ev.eventName}
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Live Stadium
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {ev.eventId}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Total Stadium Capacity</span>
                      <p className="text-lg font-black text-white font-mono">
                        {ev.totalTickets.toLocaleString()} Seats
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/60">
                    <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-lg p-2">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">Sold Seats</span>
                      <span className="text-sm font-black text-emerald-300 font-mono">
                        {ev.soldCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-amber-950/30 border border-amber-900/40 rounded-lg p-2">
                      <span className="text-[10px] uppercase font-bold text-amber-400 block">Held Seats</span>
                      <span className="text-sm font-black text-amber-300 font-mono">
                        {ev.heldCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-cyan-950/30 border border-cyan-900/40 rounded-lg p-2">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 block">Available</span>
                      <span className="text-sm font-black text-cyan-300 font-mono">
                        {ev.availableCount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Virtual Waiting Room Throttle Controller */}
          <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center space-x-3 border-b border-slate-800 pb-3 mb-4">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Virtual Queue Admission Engine</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Control the rate at which waiting room users are admitted into the checkout payment funnel. High concurrency safety valve.
              </p>

              <form onSubmit={handleAdmissionChange} className="mt-6 space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-2">
                    <span className="font-semibold">Batch Ingress Size (users/second)</span>
                    <span className="font-mono text-amber-400 font-bold">{admissionBatchSize} users</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={500}
                    step={5}
                    value={admissionBatchSize}
                    onChange={(e) => setAdmissionBatchSize(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>5 (Conservative)</span>
                    <span>100 (Standard)</span>
                    <span>500 (Flash Surge)</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={tuneMutation.isPending}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2"
                  >
                    {tuneMutation.isPending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating Redis Throttle...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apply Queue Rate</span>
                      </>
                    )}
                  </button>
                  {tuneMutation.isSuccess && (
                    <p className="text-[11px] text-emerald-400 text-center mt-2 font-medium">
                      &check; Admission rate updated in Redis
                    </p>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Hold TTL Window:</span>
                <span className="font-mono text-slate-200">600 seconds (10 mins)</span>
              </div>
              <div className="flex justify-between">
                <span>Optimistic Lock:</span>
                <span className="font-mono text-emerald-400">Active (JPA @Version)</span>
              </div>
            </div>
          </section>
        </div>

        {/* 3. DUAL-TAB AUDIT SECTION: CUSTOMER BOOKINGS & USER ACTIVITY LOGS */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Tab Bar Header */}
          <div className="p-6 border-b border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('bookings')}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition ${
                    activeTab === 'bookings'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Customer Bookings Ledger</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    activeTab === 'bookings' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {filteredBookings.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('activities')}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition ${
                    activeTab === 'activities'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>User Activity Audit Trail (DB)</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    activeTab === 'activities' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {filteredActivities.length}
                  </span>
                </button>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>DB: ticketflow.mv.db</span>
              </div>
            </div>

            {/* TAB 1: Filter Toolbar for Bookings */}
            {activeTab === 'bookings' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search customer email, name, or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 placeholder-slate-500"
                  />
                </div>

                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 appearance-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses (Confirmed, Pending, Expired)</option>
                    <option value="CONFIRMED">&check; Confirmed Only</option>
                    <option value="PENDING">&#9203; Pending (Held)</option>
                    <option value="EXPIRED">&#10007; Expired / Cancelled</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 appearance-none cursor-pointer"
                  >
                    <option value="ALL">All Event Venues</option>
                    {overview?.events?.map((ev: AdminInventoryItem) => (
                      <option key={ev.eventId} value={ev.eventId}>
                        {ev.eventName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            {/* TAB 2: Filter Toolbar for Activity Logs */}
            {activeTab === 'activities' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search user email, action, or details..."
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 placeholder-slate-500"
                  />
                </div>

                <div className="relative">
                  <select
                    value={activityActionFilter}
                    onChange={(e) => setActivityActionFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 appearance-none cursor-pointer"
                  >
                    <option value="ALL">All User Actions</option>
                    <option value="CAPTCHA_VERIFIED">CAPTCHA Solved</option>
                    <option value="TICKET_HOLD">Tickets Held in Cart</option>
                    <option value="UPI_PAYMENT_VERIFIED">UPI Payment Verified (12-Digit UTR)</option>
                    <option value="PAYMENT_REJECTED">Payment Rejected / Blocked</option>
                    <option value="ORDER_CONFIRMED">Order Confirmed</option>
                    <option value="ORDER_EXPIRED">Hold Expired</option>
                    <option value="USER_LOGIN">User Login</option>
                    <option value="USER_REGISTER">User Registered</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* TAB 1 CONTENT: Bookings Ledger Table */}
          {activeTab === 'bookings' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Customer Details</th>
                    <th className="py-3.5 px-4">Event & Venue</th>
                    <th className="py-3.5 px-4 text-center">Seats Booked</th>
                    <th className="py-3.5 px-4">Amount Paid</th>
                    <th className="py-3.5 px-4">Booking Date & Time</th>
                    <th className="py-3.5 px-4">Order Reference</th>
                    <th className="py-3.5 px-4 text-right">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-500 mb-2" />
                        Loading live customer bookings ledger...
                      </td>
                    </tr>
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No customer bookings found matching the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => {
                      const initials = (b.customerName || b.customerEmail || 'U')
                        .substring(0, 2)
                        .toUpperCase();

                      return (
                        <tr
                          key={b.orderId}
                          className="hover:bg-slate-800/40 transition group"
                        >
                          {/* Customer Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                                {initials}
                              </div>
                              <div>
                                <p className="font-semibold text-white group-hover:text-rose-400 transition">
                                  {b.customerName || 'Customer'}
                                </p>
                                <p className="text-slate-400 font-mono text-[11px]">
                                  {b.customerEmail}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Event Name */}
                          <td className="py-3.5 px-4">
                            <p className="font-medium text-slate-200">{b.eventName}</p>
                            <p className="text-slate-500 text-[11px]">{b.venue}</p>
                          </td>

                          {/* Seats Booked */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                              {b.ticketCount} {b.ticketCount === 1 ? 'Seat' : 'Seats'}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                            <span className="text-emerald-400 mr-0.5">₹</span>
                            {b.totalAmount.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>

                          {/* Date & Time */}
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                            {new Date(b.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>

                          {/* Order Reference */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                {b.orderId.substring(0, 8)}...
                              </span>
                              <button
                                onClick={() => handleCopy(b.orderId, b.orderId)}
                                title="Copy Order ID"
                                className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
                              >
                                {copiedId === b.orderId ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-right">
                            {b.status === 'CONFIRMED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                Confirmed
                              </span>
                            )}
                            {b.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                <Clock className="w-3 h-3" />
                                Held / Pending
                              </span>
                            )}
                            {b.status === 'EXPIRED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                                <AlertTriangle className="w-3 h-3" />
                                Expired
                              </span>
                            )}
                            {b.status === 'CANCELLED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                <AlertTriangle className="w-3 h-3" />
                                Cancelled
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2 CONTENT: User Activity Audit Trail Table ("enna enna pannurom ah user adhu vandhu admin la store ahganum and data base num store ahganum") */}
          {activeTab === 'activities' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Timestamp (IST)</th>
                    <th className="py-3.5 px-4">User Email</th>
                    <th className="py-3.5 px-4">Action Performed</th>
                    <th className="py-3.5 px-4">Event Details</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Client IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-500 mb-2" />
                        Loading database user activity audit trail...
                      </td>
                    </tr>
                  ) : filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No user activity records found matching current search.
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map((act) => {
                      let actionColor = 'bg-slate-800 text-slate-300 border-slate-700';
                      if (act.action === 'CAPTCHA_VERIFIED') {
                        actionColor = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
                      } else if (act.action === 'TICKET_HOLD' || act.action === 'TICKETS_HELD') {
                        actionColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                      } else if (act.action === 'UPI_PAYMENT_VERIFIED' || act.action === 'ORDER_CONFIRMED') {
                        actionColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                      } else if (act.action === 'PAYMENT_REJECTED' || act.action === 'LOGIN_FAILED' || act.action === 'CAPTCHA_FAILED') {
                        actionColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                      } else if (act.action === 'USER_LOGIN' || act.action === 'USER_REGISTER') {
                        actionColor = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
                      }

                      return (
                        <tr
                          key={act.id}
                          className="hover:bg-slate-800/40 transition group font-mono text-[11px]"
                        >
                          {/* Timestamp */}
                          <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                            {new Date(act.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>

                          {/* User Email */}
                          <td className="py-3.5 px-4 font-semibold text-slate-200">
                            {act.userEmail}
                          </td>

                          {/* Action Badge */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${actionColor}`}>
                              {act.action}
                            </span>
                          </td>

                          {/* Details */}
                          <td className="py-3.5 px-4 font-sans text-xs text-slate-300">
                            {act.details}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            {act.status === 'SUCCESS' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[10px]">
                                <CheckCircle2 className="w-3 h-3" />
                                SUCCESS
                              </span>
                            ) : act.status === 'FAILED' ? (
                              <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-[10px]">
                                <ShieldAlert className="w-3 h-3" />
                                REJECTED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[10px]">
                                <Clock className="w-3 h-3" />
                                {act.status}
                              </span>
                            )}
                          </td>

                          {/* IP Address */}
                          <td className="py-3.5 px-4 text-right text-slate-500">
                            {act.ipAddress || '127.0.0.1'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Ledger Footer */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>
              {activeTab === 'bookings'
                ? `Showing ${filteredBookings.length} of ${bookings.length} customer bookings`
                : `Showing ${filteredActivities.length} of ${activities.length} user database activity logs`}
            </span>
            <span className="font-mono text-slate-400">
              Live Database: D:\mysql\ticketflow_db\ticketflow.mv.db
            </span>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboardPage;