import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { CheckCircle2, Download, Printer, Calendar, MapPin, Ticket, Home } from 'lucide-react';
import { ordersApi } from '../api/endpoints';

export const ConfirmationPage: React.FC = () => {
  const { orderId = '' } = useParams<{ orderId: string }>();

  // Fetch confirmed order details
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(orderId),
    enabled: !!orderId,
  });

  useEffect(() => {
    // Launch celebratory confetti burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const orderData = order || {
    orderId,
    eventName: 'Coldplay: Music of the Spheres World Tour 2026',
    ticketCount: 1,
    totalAmount: 1.0,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-surge-emerald/10 border border-surge-emerald/30 flex items-center justify-center text-surge-emerald shadow-xl shadow-surge-emerald/10 animate-bounce-subtle">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-surge-emerald">Order Finalized</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white mt-1">You're Going to the Show!</h1>
        <p className="text-sm text-slate-400 mt-2">
          Your payment succeeded and official digital tickets have been assigned to your account.
        </p>
      </div>

      {/* Digital Ticket Pass Visual */}
      <div className="glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden mb-8 print:border-black print:text-black">
        {/* Ticket Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-brand-900/60 to-slate-900 border-b border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Official Digital Pass</span>
            <h2 className="text-2xl font-black text-white">{orderData.eventName}</h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase block">Order Reference</span>
            <span className="font-mono text-xs font-bold text-slate-200">{orderData.orderId.substring(0, 18)}...</span>
          </div>
        </div>

        {/* Ticket Body & QR Code */}
        <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          <div className="sm:col-span-2 space-y-4 text-sm text-slate-300">
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-brand-400" />
              <span>Saturday, Oct 24, 2026 • Gates open 5:30 PM</span>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="w-4 h-4 text-surge-cyan" />
              <span>Wembley Stadium, London, UK</span>
            </div>
            <div className="flex items-center space-x-3">
              <Ticket className="w-4 h-4 text-surge-emerald" />
              <span>{orderData.ticketCount}x General Admission (Pitch Standing)</span>
            </div>
            <div className="pt-2 text-xs text-slate-400 font-mono flex items-center space-x-2">
              <span>Status: <strong className="text-surge-emerald font-bold">CONFIRMED</strong></span>
              <span>•</span>
              <span>Total Paid: <strong>₹{orderData.totalAmount.toFixed(2)}</strong></span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Paid via UPI to CSE 13 DIVYADHARSHINI B (dharshu0046-1@okicici)</span>
            </div>
          </div>

          {/* Mock QR Code Graphic */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-slate-950 text-center shadow-lg">
            <div className="w-32 h-32 flex items-center justify-center bg-slate-100 rounded-xl p-2 border border-slate-300">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" fill="white" />
                {/* Simulated QR matrix blocks */}
                <rect x="10" y="10" width="25" height="25" fill="black" />
                <rect x="15" y="15" width="15" height="15" fill="white" />
                <rect x="18" y="18" width="9" height="9" fill="black" />

                <rect x="65" y="10" width="25" height="25" fill="black" />
                <rect x="70" y="15" width="15" height="15" fill="white" />
                <rect x="73" y="18" width="9" height="9" fill="black" />

                <rect x="10" y="65" width="25" height="25" fill="black" />
                <rect x="15" y="70" width="15" height="15" fill="white" />
                <rect x="18" y="73" width="9" height="9" fill="black" />

                <rect x="42" y="15" width="15" height="8" fill="black" />
                <rect x="42" y="30" width="8" height="15" fill="black" />
                <rect x="55" y="42" width="12" height="12" fill="black" />
                <rect x="42" y="65" width="20" height="8" fill="black" />
                <rect x="68" y="65" width="8" height="20" fill="black" />
              </svg>
            </div>
            <span className="text-[10px] font-mono font-bold tracking-widest mt-2 uppercase text-slate-700">Scan at Gate</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 print:hidden">
        <button
          onClick={handlePrint}
          className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-semibold text-white flex items-center space-x-2 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Print Pass</span>
        </button>

        <button
          onClick={handlePrint}
          className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-semibold text-white flex items-center space-x-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Save PDF</span>
        </button>

        <Link
          to="/"
          className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 flex items-center space-x-2 transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Return to Events</span>
        </Link>
      </div>
    </div>
  );
};
