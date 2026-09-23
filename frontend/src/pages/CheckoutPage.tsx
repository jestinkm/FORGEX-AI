import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ShieldCheck,
  Wallet,
  AlertCircle,
  ArrowRight,
  Minus,
  Plus,
  Armchair,
  Check,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { useQueueStore } from '../store/queueStore';
import { useOrderStore } from '../store/orderStore';
import { ordersApi, eventsApi, seatingApi } from '../api/endpoints';
import { SectionDto, SeatDto } from '../types';
import { HoldCountdownTimer } from '../components/HoldCountdownTimer';

const MAX_SEATS = 4;
const SERVICE_FEE_PER_TICKET = 0.0;

export const CheckoutPage: React.FC = () => {
  const { eventId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const { admissionToken, clearQueue } = useQueueStore();
  const { setHold } = useOrderStore();

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [sections, setSections] = useState<SectionDto[]>([]);
  const [reservedSeats, setReservedSeats] = useState<Set<string>>(new Set());
  const [isLoadingSeats, setIsLoadingSeats] = useState<boolean>(false);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const expiresAt = useMemo(() => new Date(Date.now() + 600 * 1000).toISOString(), []);

  // Security Gate: Redirect to waiting room if no admission token exists in sessionStorage
  useEffect(() => {
    if (!admissionToken) {
      navigate(`/waiting-room/${eventId}`);
    }
  }, [admissionToken, eventId, navigate]);

  // Fetch dynamic seating layout from backend / Supabase
  const fetchLayoutAndSeats = async () => {
    try {
      setIsLoadingSeats(true);
      const [layoutRes, reservedRes] = await Promise.allSettled([
        seatingApi.getLayout(eventId),
        eventsApi.getReservedSeats(eventId),
      ]);

      if (layoutRes.status === 'fulfilled' && layoutRes.value?.sections) {
        const sanitizedSections = layoutRes.value.sections.map((sec) => {
          const fallbackPrice =
            sec.sectionCode === 'VIP' ? 3000 : sec.sectionCode === 'PREMIUM' ? 1800 : 800;
          const sectionPrice =
            sec.basePrice != null && !isNaN(Number(sec.basePrice))
              ? Number(sec.basePrice)
              : fallbackPrice;
          return {
            ...sec,
            basePrice: sectionPrice,
            rows: (sec.rows || []).map((row) => ({
              ...row,
              seats: (row.seats || []).map((seat) => ({
                ...seat,
                price:
                  seat.price != null && !isNaN(Number(seat.price))
                    ? Number(seat.price)
                    : sectionPrice,
              })),
            })),
          };
        });
        setSections(sanitizedSections);
      }

      if (reservedRes.status === 'fulfilled' && reservedRes.value) {
        setReservedSeats(new Set(reservedRes.value.map((s) => s.toUpperCase())));
      }
    } catch {
      // Non-fatal
    } finally {
      setIsLoadingSeats(false);
    }
  };

  useEffect(() => {
    fetchLayoutAndSeats();
  }, [eventId]);

  // Seat dictionary for rapid lookup of prices and properties
  const seatMap = useMemo(() => {
    const map = new Map<string, SeatDto>();
    sections.forEach((sec) => {
      sec.rows.forEach((row) => {
        row.seats.forEach((seat) => {
          map.set(seat.seatCode.toUpperCase(), seat);
        });
      });
    });
    return map;
  }, [sections]);

  const allAvailableSeatCodes = useMemo(() => {
    const available: string[] = [];
    sections.forEach((sec) => {
      sec.rows.forEach((row) => {
        row.seats.forEach((seat) => {
          const code = seat.seatCode.toUpperCase();
          const isUnavailable =
            seat.isBlocked ||
            seat.status === 'BLOCKED' ||
            seat.status === 'BOOKED' ||
            seat.status === 'HELD' ||
            reservedSeats.has(code);
          if (!isUnavailable) {
            available.push(code);
          }
        });
      });
    });
    return available;
  }, [sections, reservedSeats]);

  // Auto-pick first available seat on initial load if none selected
  useEffect(() => {
    if (selectedSeats.length === 0 && allAvailableSeatCodes.length > 0) {
      setSelectedSeats([allAvailableSeatCodes[0]]);
      setQuantity(1);
    }
  }, [allAvailableSeatCodes]);

  // Handle seat click
  const handleSeatClick = (seatCode: string) => {
    const cleanCode = seatCode.toUpperCase();
    const seat = seatMap.get(cleanCode);
    if (!seat) return;

    const isUnavailable =
      seat.isBlocked ||
      seat.status === 'BLOCKED' ||
      seat.status === 'BOOKED' ||
      seat.status === 'HELD' ||
      reservedSeats.has(cleanCode);

    if (isUnavailable) return;

    setErrorMessage(null);
    if (selectedSeats.includes(cleanCode)) {
      const next = selectedSeats.filter((s) => s !== cleanCode);
      setSelectedSeats(next);
      setQuantity(Math.max(1, next.length));
    } else {
      if (selectedSeats.length >= MAX_SEATS) {
        setErrorMessage(`Maximum limit reached! You can select up to ${MAX_SEATS} seats per checkout.`);
        return;
      }
      const next = [...selectedSeats, cleanCode];
      setSelectedSeats(next);
      setQuantity(next.length);
    }
  };

  // Handle Quantity Stepper
  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1 || newQty > MAX_SEATS) return;
    setErrorMessage(null);
    setQuantity(newQty);

    if (newQty < selectedSeats.length) {
      setSelectedSeats(selectedSeats.slice(0, newQty));
    } else if (newQty > selectedSeats.length) {
      const needed = newQty - selectedSeats.length;
      const unselectedAvailable = allAvailableSeatCodes.filter((c) => !selectedSeats.includes(c));
      const next = [...selectedSeats, ...unselectedAvailable.slice(0, needed)];
      setSelectedSeats(next);
    }
  };

  // Dynamic Subtotal based on each individual selected seat's price
  const subtotal = useMemo(() => {
    if (selectedSeats.length === 0) return 0;
    return selectedSeats.reduce((acc, code) => {
      const seat = seatMap.get(code.toUpperCase());
      return acc + (seat?.price ? Number(seat.price) : 1000);
    }, 0);
  }, [selectedSeats, seatMap]);

  const fees = selectedSeats.length * SERVICE_FEE_PER_TICKET;
  const total = subtotal + fees;

  // Handle Hold Ticket Creation
  const handleProceedToPayment = async () => {
    setIsHolding(true);
    setErrorMessage(null);

    const seatString = selectedSeats.length > 0 ? selectedSeats.join(', ') : undefined;
    const finalCount = selectedSeats.length > 0 ? selectedSeats.length : quantity;

    try {
      const holdResponse = await ordersApi.hold(eventId, finalCount, seatString);
      setHold(holdResponse);
      navigate(`/payment/${holdResponse.orderId}`);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrorMessage('High concurrent traffic! Some of the seats were just reserved by another buyer. Please select available seats.');
        fetchLayoutAndSeats();
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
    setErrorMessage('Hold timer expired. Please reselect your tickets.');
    setSelectedSeats([]);
    fetchLayoutAndSeats();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Top Banner: Security Token Validated */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-surge-emerald/20 border border-surge-emerald/30 flex items-center justify-center text-surge-emerald">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-bold text-surge-emerald tracking-wider">
                FairSeat Virtual Waiting Room Token Active
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                10-Min Session
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono truncate max-w-md">
              Token: {admissionToken ? `${admissionToken.substring(0, 24)}...` : 'Active'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-center">
          <HoldCountdownTimer expiresAt={expiresAt} onExpire={handleHoldExpire} />
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300 text-sm animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <div>
            <span className="font-bold">Reservation Notice: </span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Dynamic Stadium Seating Map */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Armchair className="w-5 h-5 text-indigo-400" />
                  <span>FairSeat Interactive Stadium Seating Matrix</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Admin-designed layout synced live with Supabase PostgreSQL. Select up to {MAX_SEATS} seats.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchLayoutAndSeats}
                disabled={isLoadingSeats}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white transition flex items-center space-x-1.5 text-xs self-start"
                title="Refresh Seat Status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSeats ? 'animate-spin' : ''}`} />
                <span>Sync Seats</span>
              </button>
            </div>

            {/* BookMyShow Curved Cinema Screen */}
            <div className="w-full max-w-xl mx-auto my-6 flex flex-col items-center">
              <div className="w-full h-9 relative flex items-center justify-center">
                <svg className="w-full h-12 overflow-visible" viewBox="0 0 600 40">
                  <path
                    d="M 20 35 Q 300 0 580 35"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_15px_rgba(56,189,248,0.7)]"
                  />
                </svg>
              </div>
              <p className="text-[11px] font-bold tracking-[0.28em] text-sky-400 uppercase mt-1 flex items-center gap-2">
                <span>🎬</span> ALL EYES THIS WAY • SCREEN
              </p>
            </div>

            {/* Dynamic Seating Sections */}
            <div className="space-y-6 overflow-x-auto pb-2">
              {sections.map((sec) => (
                <div
                  key={sec.sectionCode}
                  className={`border rounded-2xl p-4 sm:p-5 space-y-3.5 ${
                    sec.sectionCode === 'RECLINER' || sec.sectionCode === 'VIP'
                      ? 'bg-amber-950/10 border-amber-500/25'
                      : sec.sectionCode === 'PRIME' || sec.sectionCode === 'PREMIUM'
                      ? 'bg-cyan-950/10 border-cyan-500/25'
                      : 'bg-emerald-950/10 border-emerald-500/25'
                  }`}
                >
                  <div className="flex items-center justify-between px-1 border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        sec.sectionCode === 'RECLINER' || sec.sectionCode === 'VIP'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : sec.sectionCode === 'PRIME' || sec.sectionCode === 'PREMIUM'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {sec.sectionCode}
                      </span>
                      <span>{sec.sectionName}</span>
                    </span>
                    <span className="text-xs text-emerald-400 font-mono font-bold">
                      ₹{Number(sec.basePrice || 1000).toFixed(2)}/seat
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {sec.rows.map((row) => (
                      <div key={row.rowLabel} className="flex items-center space-x-2.5">
                        {/* Left Row Indicator */}
                        <span className="w-6 text-center font-mono font-bold text-slate-400 text-xs py-1 rounded bg-slate-950 border border-slate-800">
                          {row.rowLabel}
                        </span>
                        <div className="flex-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                          {row.seats.map((seat, sIdx) => {
                            const code = seat.seatCode.toUpperCase();
                            const isReserved =
                              seat.isBlocked ||
                              seat.status === 'BLOCKED' ||
                              seat.status === 'BOOKED' ||
                              seat.status === 'HELD' ||
                              reservedSeats.has(code);
                            const isSelected = selectedSeats.includes(code);
                            const isAisleGap = row.aislePositions?.includes(sIdx + 1);

                            return (
                              <React.Fragment key={code}>
                                <button
                                  type="button"
                                  disabled={isReserved}
                                  onClick={() => handleSeatClick(code)}
                                  title={
                                    seat.isBlocked || seat.status === 'BLOCKED'
                                      ? `Seat ${code}: Blocked by Admin`
                                      : isReserved
                                      ? `Seat ${code}: Reserved / Booked`
                                      : isSelected
                                      ? `Seat ${code}: Selected (Click to remove)`
                                      : `Seat ${code}: Available • ₹${Number(seat.price || sec.basePrice || 1000).toFixed(2)} (Click to select)`
                                  }
                                  className={`
                                    h-10 sm:h-11 px-2 min-w-[38px] rounded-xl text-[11px] sm:text-xs font-mono font-bold transition-all duration-150 flex flex-col items-center justify-center relative cursor-pointer
                                    ${
                                      seat.isBlocked || seat.status === 'BLOCKED'
                                        ? 'bg-slate-950 border border-slate-800 text-slate-600 cursor-not-allowed line-through'
                                        : isReserved
                                        ? 'bg-slate-900/60 border border-slate-800 text-rose-500/40 cursor-not-allowed line-through'
                                        : isSelected
                                        ? 'bg-[#2dc492] text-white border-2 border-emerald-300 shadow-lg shadow-[#2dc492]/40 scale-105 z-10 font-black'
                                        : sec.sectionCode === 'RECLINER' || sec.sectionCode === 'VIP'
                                        ? 'bg-slate-900 border border-amber-500/30 text-amber-200 hover:border-amber-400 hover:scale-105'
                                        : sec.sectionCode === 'PRIME' || sec.sectionCode === 'PREMIUM'
                                        ? 'bg-slate-900 border border-cyan-500/30 text-cyan-200 hover:border-cyan-400 hover:scale-105'
                                        : 'bg-slate-900 border border-emerald-500/30 text-emerald-200 hover:border-emerald-400 hover:scale-105'
                                    }
                                  `}
                                >
                                  <div className="flex items-center space-x-0.5">
                                    {seat.isAccessible && <span className="text-[9px] text-cyan-300">♿</span>}
                                    {seat.isBlocked && <Lock className="w-2.5 h-2.5 text-slate-500" />}
                                    <span className="leading-tight">
                                      {seat.seatNumber < 10 ? `0${seat.seatNumber}` : seat.seatNumber}
                                    </span>
                                  </div>
                                  <span className="text-[8px] opacity-70 leading-none">₹{seat.price}</span>
                                  {isSelected && (
                                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white text-[#2dc492] rounded-full flex items-center justify-center text-[8px] font-black shadow">
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    </div>
                                  )}
                                </button>
                                {isAisleGap && (
                                  <div className="w-3 text-center text-slate-700 font-mono text-[10px]">
                                    •
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                        {/* Right Row Indicator (BookMyShow dual-indicator style) */}
                        <span className="w-6 text-center font-mono font-bold text-slate-400 text-xs py-1 rounded bg-slate-950 border border-slate-800">
                          {row.rowLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* BookMyShow Map Legend */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-md bg-[#2dc492] border border-emerald-300 shadow-sm shadow-[#2dc492]/40"></div>
                <span className="text-white font-medium">Selected ({selectedSeats.length})</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-md bg-slate-900 border border-emerald-500/30"></div>
                <span className="text-slate-300">Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-md bg-slate-900/60 border border-slate-800 text-rose-500/40 text-[10px] text-center">✕</div>
                <span className="text-slate-400">Sold / Held</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-md bg-slate-950 border border-slate-800 text-slate-600 text-[10px] text-center">🔒</div>
                <span className="text-slate-500">Blocked</span>
              </div>
              <div className="flex items-center space-x-1.5 text-cyan-300">
                <span>♿ Accessible</span>
              </div>
            </div>

            {/* Selected Seats Badges */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Your Chosen Seats ({selectedSeats.length}/{MAX_SEATS}):
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">
                  {selectedSeats.length === 0 ? 'No seats picked yet' : `${selectedSeats.length} seat(s) reserved`}
                </span>
              </div>

              {selectedSeats.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedSeats.map((code) => {
                    const s = seatMap.get(code.toUpperCase());
                    return (
                      <span
                        key={code}
                        className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-mono font-bold bg-[#2dc492]/15 text-[#2dc492] border border-[#2dc492]/30 shadow-sm"
                      >
                        <Armchair className="w-3.5 h-3.5 mr-1.5 text-[#2dc492]" />
                        {code} {s ? `(₹${s.price})` : ''}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Click any available seat above to select it, or use the quantity counter below.
                </p>
              )}
            </div>

            {/* Quantity Stepper & Quick Adjustment */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block text-sm">Ticket Quantity</span>
                <span className="text-xs text-slate-400">Syncs automatically with seat matrix</span>
              </div>

              <div className="flex items-center space-x-3 bg-slate-900 p-1.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono text-lg font-bold text-white w-6 text-center">{quantity}</span>
                <button
                  type="button"
                  disabled={quantity >= MAX_SEATS}
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Zero-Oversell Notice */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 leading-relaxed">
              🔒 <strong className="text-slate-300">Optimistic Seat Locking:</strong> Your chosen seats are locked in Supabase PostgreSQL and cryptographically verified on the FairSeat ledger upon checkout confirmation.
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="space-y-6">
          <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 sticky top-24 shadow-2xl backdrop-blur-md">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <span>Order Summary</span>
            </h3>

            <div className="space-y-3 text-sm text-slate-300 pb-4 border-b border-slate-800">
              <div className="flex justify-between items-start">
                <span>{selectedSeats.length || quantity}x Stadium Pass</span>
                <span className="font-mono text-white font-semibold">₹{Number(subtotal || 0).toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-start pt-1">
                <span className="text-xs text-slate-400">Assigned Seats</span>
                <span className="font-mono text-amber-300 font-semibold text-xs text-right max-w-[150px] leading-tight">
                  {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Auto-assigned'}
                </span>
              </div>

              <div className="flex justify-between text-xs text-slate-400">
                <span>Database Allocation</span>
                <span className="font-mono text-cyan-300">Supabase DB</span>
              </div>
            </div>

            <div className="py-4 flex justify-between items-center text-base font-bold text-white">
              <span>Total Due</span>
              <span className="font-mono text-2xl text-emerald-400">₹{Number(total || 0).toFixed(2)}</span>
            </div>

            <button
              onClick={handleProceedToPayment}
              disabled={isHolding || selectedSeats.length === 0}
              className="w-full py-4 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-xl shadow-emerald-600/25 flex items-center justify-center space-x-2 transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Wallet className="w-4 h-4" />
              <span>{isHolding ? 'Reserving Inventory in Supabase...' : 'Proceed to UPI Payment'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* BookMyShow Sticky Bottom Payment CTA Bar */}
      {selectedSeats.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 p-4 shadow-2xl sm:hidden flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-mono block">
              {selectedSeats.length} {selectedSeats.length === 1 ? 'Seat' : 'Seats'} ({selectedSeats.join(', ')})
            </span>
            <span className="text-lg font-black text-white font-mono">
              ₹{Number(total || 0).toFixed(2)}
            </span>
          </div>
          <button
            onClick={handleProceedToPayment}
            disabled={isHolding}
            className="py-2.5 px-5 rounded-xl font-bold text-xs bg-[#2dc492] hover:bg-emerald-400 text-slate-950 shadow-lg shadow-[#2dc492]/30 flex items-center space-x-1.5 transition active:scale-95"
          >
            <span>{isHolding ? 'Reserving...' : `Pay ₹${Number(total || 0).toFixed(2)}`}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
export default CheckoutPage;
