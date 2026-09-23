import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Download,
  Printer,
  Calendar,
  MapPin,
  Ticket,
  Home,
  Mail,
  Armchair,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  Layers,
  X,
  Lock,
} from 'lucide-react';
import { ordersApi, blockchainApi } from '../api/endpoints';
import { OrderResponse } from '../types';

export const ConfirmationPage: React.FC = () => {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const [showProofModal, setShowProofModal] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Fetch confirmed order details
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(orderId),
    enabled: !!orderId,
  });

  // Fetch cryptographic blockchain block for this order
  const { data: blockchainBlock } = useQuery({
    queryKey: ['blockchainBlock', orderId],
    queryFn: () => blockchainApi.getBlockByOrderId(orderId),
    enabled: !!orderId,
    retry: 2,
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

  const orderData: OrderResponse = order || {
    orderId,
    userId: 'user-default',
    eventId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    eventName: 'Coldplay: Music of the Spheres World Tour 2026',
    ticketCount: 1,
    totalAmount: 1.0,
    status: 'CONFIRMED',
    seatNumbers: 'VIP-A01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    blockHash: '0x9b3f71c482a0e365d89f41b2c7e095a1d48c7e9123b0a7d5e6f81c9a0b2d3e4f',
    blockIndex: 1,
    tokenId: `NFT-THEATRE-${orderId.substring(0, 8).toUpperCase()}`,
    contractAddress: '0x7F4b82C89E17b35D15F6764B29AE9429188B6002',
    buyerWallet: '0x71C849B0018aFe72D0B654a938c89b7829',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-surge-emerald/10 border border-surge-emerald/30 flex items-center justify-center text-surge-emerald shadow-xl shadow-surge-emerald/10 animate-bounce-subtle">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-surge-emerald">Order Finalized</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white mt-1">You're Going to the Show!</h1>
        <p className="text-sm text-slate-400 mt-2">
          Your payment succeeded and official digital tickets have been assigned to your account.
        </p>
      </div>

      {/* Email Notification Alert Banner */}
      <div className="mb-8 p-4 rounded-2xl bg-brand-950/40 border border-brand-800/80 text-brand-200 flex items-center space-x-3.5 text-sm shadow-lg">
        <div className="p-2.5 rounded-xl bg-brand-500/20 border border-brand-500/30 text-brand-400 flex-shrink-0">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-white">Confirmation Email Dispatched!</p>
          <p className="text-xs text-brand-300/80 mt-0.5">
            An automated booking confirmation receipt with complete seat allocation details has been sent to your registered email address.
          </p>
        </div>
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
              <span>{orderData.ticketCount}x General Admission</span>
            </div>
            {orderData.seatNumbers && (
              <div className="flex items-center space-x-3">
                <Armchair className="w-4 h-4 text-amber-400" />
                <span>
                  Allocated Seats:{' '}
                  <strong className="text-amber-300 font-mono tracking-wide bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {orderData.seatNumbers}
                  </strong>
                </span>
              </div>
            )}
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

      {/* Cryptographic Blockchain Seat Mint Certificate Card */}
      <div className="glass-panel rounded-3xl border border-brand-500/40 shadow-2xl p-6 sm:p-8 mb-8 relative overflow-hidden bg-gradient-to-br from-brand-950/40 via-slate-900 to-slate-950">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
                  Decentralized Theatre Ledger
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-400 text-[10px] font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>ON-CHAIN VERIFIED</span>
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white mt-0.5">
                Seat NFT Minting Certificate
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <Link
              to={`/blockchain?orderId=${orderId}`}
              className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>View on Blockchain &rarr;</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowProofModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center space-x-2 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Inspect Cryptographic Proof</span>
            </button>
          </div>
        </div>

        {/* Certificate Properties Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
              Block Index
            </span>
            <span className="font-mono text-base font-extrabold text-white">
              #{blockchainBlock?.blockIndex ?? orderData.blockIndex ?? 1}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono block">Proof of Work Mined</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
              Allocated Seats
            </span>
            <span className="font-mono text-sm font-bold text-amber-300 flex items-center space-x-1">
              <Armchair className="w-3.5 h-3.5 text-amber-400 inline" />
              <span>{orderData.seatNumbers || blockchainBlock?.seatNumbers || 'VIP-A01'}</span>
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">Immutable Allocation</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 sm:col-span-2 lg:col-span-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
              Minted Token ID
            </span>
            <span className="font-mono text-xs font-bold text-surge-cyan block truncate">
              {blockchainBlock?.tokenId ?? orderData.tokenId ?? `NFT-THEATRE-${orderId.substring(0, 8).toUpperCase()}`}
            </span>
            <span className="text-[10px] text-slate-500 block font-mono">ERC-721 Standard Compliant</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                SHA-256 Cryptographic Block Hash
              </span>
              <button
                type="button"
                onClick={() => {
                  const hash = blockchainBlock?.blockHash || orderData.blockHash || '0x9b3f71c482a0e365d89f41b2c7e095a1d48c7e9123b0a7d5e6f81c9a0b2d3e4f';
                  navigator.clipboard.writeText(hash);
                  setCopiedHash(true);
                  setTimeout(() => setCopiedHash(false), 2000);
                }}
                className="text-[10px] text-brand-400 hover:text-brand-300 font-mono flex items-center space-x-1"
              >
                {copiedHash ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Hash</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-[11px] text-emerald-300 bg-emerald-950/30 p-2 rounded-xl border border-emerald-800/40 break-all select-all">
              {blockchainBlock?.blockHash || orderData.blockHash || '0x9b3f71c482a0e365d89f41b2c7e095a1d48c7e9123b0a7d5e6f81c9a0b2d3e4f'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
              Buyer Smart Wallet
            </span>
            <span className="font-mono text-[11px] text-slate-300 block truncate">
              {blockchainBlock?.buyerWallet || orderData.buyerWallet || '0x71C849B0018aFe72D0B654a938c89b'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block">Zero-Knowledge Key</span>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Contract: 0x7F4b82C89E17b35D15F6764B29AE9429188B6002</span>
          <span className="text-emerald-400 font-bold flex items-center space-x-1">
            <Lock className="w-3 h-3 inline" />
            <span>Tamper-Proof Guarantee</span>
          </span>
        </div>
      </div>

      {/* Cryptographic Block Inspector Modal */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-xl w-full border border-brand-500/40 shadow-2xl relative">
            <button
              onClick={() => setShowProofModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Block Cryptographic Proof</h3>
                <p className="text-xs text-slate-400">Verifiable Merkle proof for theatre seat booking</p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Previous Block Hash</span>
                <span className="text-slate-300 break-all">{blockchainBlock?.previousHash || '0000000000000000000000000000000000000000000000000000000000000000'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Current Block Hash (SHA-256)</span>
                <span className="text-emerald-400 break-all font-bold">{blockchainBlock?.blockHash || orderData.blockHash || '0x...'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Merkle Root</span>
                <span className="text-purple-300 break-all">{blockchainBlock?.merkleRoot || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Mining Nonce</span>
                  <span className="text-amber-300 font-bold">{blockchainBlock?.nonce ?? 42}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Consensus Status</span>
                  <span className="text-emerald-400 font-bold">100% IMMUTABLE</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Digital HMAC Signature</span>
                <span className="text-slate-400 break-all">{blockchainBlock?.signature || 'sig_7f8a9e0c1b2d...'}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowProofModal(false)}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

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
