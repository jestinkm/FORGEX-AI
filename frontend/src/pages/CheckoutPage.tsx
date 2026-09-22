import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Ticket, ShieldCheck, Wallet, AlertCircle, ArrowRight, Minus, Plus } from 'lucide-react';
import { useQueueStore } from '../store/queueStore';
import { useOrderStore } from '../store/orderStore';
import { ordersApi } from '../api/endpoints';
import { HoldCountdownTimer } from '../components/HoldCountdownTimer';

const TICKET_PRICE = 1.0;
const SERVICE_FEE_PER_TICKET = 0.0;

export const CheckoutPage: React.FC = () => {
  const { eventId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const { admissionToken, clearQueue } = useQueueStore();
  const { currentHold, setHold, clearHold } = useOrderStore();

  const [quantity, setQuantity] = useState<number>(1);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Security Gate: Redirect to waiting room if no admission token exists in sessionStorage
  useEffect(() => {
    if (!admissionToken) {
      navigate(`/waiting-room/${eventId}`);
    }
  }, [admissionToken, eventId, navigate]);

  // Handle Hold Ticket Creation
  const handleProceedToPayment = async () => {
    setIsHolding(true);
    setErrorMessage(null);

    try {
      const holdResponse = await ordersApi.hold(eventId, quantity);
      setHold(holdResponse);
      navigate(`/payment/${holdResponse.orderId}`);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrorMessage('High concurrent traffic! Please retry reserving your tickets.');
      } else if (err.response?.status === 403) {
        setErrorMessage('Admission session expired. Please rejoin the waiting room.');
        clearQueue();
        setTimeout(() => navigate(`/waiting-room/${eventId}`), 2000);
      } else {
        setErrorMessage(err.response?.data?.message || 'Failed to hold tickets. Please try again.');
      }
    } finally {
      setIsHolding(false);
    }
  };

  const handleHoldExpire = () => {
    clearHold();
    clearQueue();
    window.dispatchEvent(new CustomEvent('app:admission-expired'));
  };

  const subtotal = quantity * TICKET_PRICE;
  const fees = quantity * SERVICE_FEE_PER_TICKET;
  const total = subtotal + fees;

  // Default expiration preview: 10 minutes from now if hold not yet created
  const previewExpiry = currentHold?.holdExpiresAt || new Date(Date.now() + 600_000).toISOString();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Header & Countdown Timer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-surge-emerald uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified Queue Access Granted</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Select Tickets & Reserve</h1>
        </div>

        <HoldCountdownTimer expiresAt={previewExpiry} onExpire={handleHoldExpire} />
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Ticket Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <Ticket className="w-5 h-5 text-brand-400" />
              <span>Ticket Selection</span>
            </h2>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">General Admission - Stadium Pitch</span>
                <span className="text-xs text-slate-400">Max 4 tickets per verified customer</span>
                <div className="mt-1 font-mono font-bold text-brand-400 text-lg">₹{TICKET_PRICE.toFixed(2)}</div>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center space-x-3 bg-slate-950 p-1.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono text-lg font-bold text-white w-6 text-center">{quantity}</span>
                <button
                  type="button"
                  disabled={quantity >= 4}
                  onClick={() => setQuantity((q) => Math.min(4, q + 1))}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Invariant & Concurrency Notice */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
              🔒 <strong className="text-slate-300">Zero-Oversell Protection:</strong> Once you click Proceed, your tickets will be locked using database-level optimistic versioning and reserved exclusively for 10 minutes.
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 sticky top-24">
            <h3 className="text-base font-bold text-white mb-4">Order Summary</h3>

            <div className="space-y-3 text-sm text-slate-300 pb-4 border-b border-slate-800">
              <div className="flex justify-between">
                <span>{quantity}x General Admission</span>
                <span className="font-mono text-white">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Service & Processing Fee</span>
                <span className="font-mono text-slate-300">₹{fees.toFixed(2)}</span>
              </div>
            </div>

            <div className="py-4 flex justify-between items-center text-base font-bold text-white">
              <span>Total Due</span>
              <span className="font-mono text-xl text-surge-emerald">₹{total.toFixed(2)}</span>
            </div>

            <button
              onClick={handleProceedToPayment}
              disabled={isHolding}
              className="w-full py-4 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-xl shadow-emerald-600/25 flex items-center justify-center space-x-2 transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Wallet className="w-4 h-4" />
              <span>{isHolding ? 'Reserving Inventory...' : 'Proceed to UPI Payment'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
