import React from 'react';
import { Link } from 'react-router-dom';
import { TicketX, Bell, Home } from 'lucide-react';

export const SoldOutPage: React.FC = () => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="glass-panel p-8 sm:p-12 rounded-3xl max-w-lg w-full border border-slate-800 text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-rose-950/40 border border-surge-rose/30 flex items-center justify-center text-surge-rose">
          <TicketX className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-surge-rose">Allocation Exhausted</span>
        <h1 className="text-3xl font-black text-white mt-1 mb-3">All Tickets Sold Out</h1>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          Due to extraordinary demand, the current flash sale allocation has reached 100% capacity. Any unconfirmed or expired holds will automatically return to the queue.
        </p>

        {/* Waitlist Subscription */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 mb-8">
          <span className="text-xs font-semibold text-slate-300 block mb-2">
            Get notified if more tickets are released
          </span>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-brand-500"
            />
            <button className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors">
              <Bell className="w-3.5 h-3.5" />
              <span>Notify</span>
            </button>
          </div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-slate-300 border border-slate-800 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Browse Available Events</span>
        </Link>
      </div>
    </div>
  );
};
