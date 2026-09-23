import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Layers,
  ShieldCheck,
  Cpu,
  Search,
  Copy,
  Check,
  CheckCircle2,
  RefreshCw,
  Armchair,
  Wallet,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';
import { blockchainApi } from '../api/endpoints';
import { BlockchainVerifyResponse } from '../types';

export const BlockchainExplorerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const highlightedOrderId = searchParams.get('orderId') || '';

  const [searchQuery, setSearchQuery] = useState(highlightedOrderId);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<BlockchainVerifyResponse | null>(null);

  // 1. Fetch entire blockchain chain
  const { data: chain = [], isLoading: isLoadingChain } = useQuery({
    queryKey: ['blockchain-chain'],
    queryFn: () => blockchainApi.getChain(),
    refetchInterval: 5000,
  });

  // 2. Fetch blockchain network stats
  const { data: stats } = useQuery({
    queryKey: ['blockchain-stats'],
    queryFn: () => blockchainApi.getStats(),
    refetchInterval: 5000,
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const res = await blockchainApi.verifyChain();
      setVerifyResult(res);
    } catch {
      // Non-fatal
    } finally {
      setIsVerifying(false);
    }
  };

  // Filter blocks by search query
  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return chain;
    const q = searchQuery.toLowerCase().trim();
    return chain.filter(
      (b) =>
        b.blockHash.toLowerCase().includes(q) ||
        (b.orderId && b.orderId.toLowerCase().includes(q)) ||
        (b.buyerName && b.buyerName.toLowerCase().includes(q)) ||
        (b.seatNumbers && b.seatNumbers.toLowerCase().includes(q)) ||
        (b.tokenId && b.tokenId.toLowerCase().includes(q)) ||
        (b.buyerWallet && b.buyerWallet.toLowerCase().includes(q)) ||
        String(b.blockIndex) === q
    );
  }, [chain, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  FairSeat Decentralized Ledger
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  PoA Mainnet
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Cryptographic Proof-of-Authority seat booking ledger, Merkle hash trees, and ERC-721 NFT tickets
              </p>
            </div>
          </div>
        </div>

        {/* Live Integrity Checker Action */}
        <div className="flex items-center space-x-3 self-start md:self-center">
          <button
            type="button"
            onClick={handleVerifyIntegrity}
            disabled={isVerifying}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center space-x-2 transition-all transform active:scale-95 disabled:opacity-50"
          >
            {isVerifying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
            )}
            <span>{isVerifying ? 'Evaluating Hashes...' : 'Verify Chain Integrity'}</span>
          </button>
        </div>
      </div>

      {/* Network Observability Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Block Height</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono">
            #{stats?.blockHeight ?? (chain.length ? Math.max(...chain.map((b) => b.blockIndex), 0) : 0)}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">Current Mined Blocks</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>On-Chain Seats</span>
            <Armchair className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300 font-mono">
            {stats?.totalSeatsOnChain ?? chain.reduce((acc, b) => acc + (b.ticketCount || 0), 0)}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">Immutable Allocations</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Consensus Protocol</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-base font-bold text-cyan-300 truncate">
            {stats?.consensusAlgorithm || 'PoW / PoA Hybrid'}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">Zero-Collision Minting</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Smart Contract</span>
            <Lock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-300 truncate max-w-[110px]">
              {stats?.contractAddress || '0x7F4b82C89E...'}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(stats?.contractAddress || '0x7F4b82C89E17b35D15F6764B29AE9429188B6002')}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              title="Copy Contract Address"
            >
              {copiedText === (stats?.contractAddress || '0x7F4b82C89E17b35D15F6764B29AE9429188B6002') ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">ERC-721 Genesis Core</span>
        </div>
      </div>

      {/* Chain Integrity Alert Banner if evaluated */}
      {verifyResult && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-4 animate-fade-in ${
            verifyResult.valid
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                verifyResult.valid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block">
                {verifyResult.valid ? 'Cryptographic Integrity Verified ✓' : 'Chain Integrity Warning!'}
              </span>
              <p className="text-xs opacity-90 font-mono mt-0.5">
                {verifyResult.message} &bull; {verifyResult.totalBlocks} Blocks Evaluated &bull; {verifyResult.verifiedSeats} Seats Validated
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 font-bold">
            {verifyResult.consensusStatus}
          </span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search blockchain by Order ID, Block Hash, Seat (e.g. VIP-A01), Wallet Address, or Buyer Name..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-white text-xs sm:text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition shadow-inner font-mono"
          />
        </div>
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-semibold transition"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Blocks Visualizer Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-bold uppercase tracking-wider">
            Ledger Blocks ({filteredBlocks.length} of {chain.length})
          </span>
          <span className="font-mono text-[11px]">Chronological Order (Genesis Block #0 &rarr; Latest)</span>
        </div>

        {isLoadingChain ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Synchronizing Blockchain Ledger...</p>
          </div>
        ) : filteredBlocks.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 p-8">
            <p className="text-sm font-semibold text-slate-300">No blockchain blocks match your search query.</p>
            <p className="text-xs text-slate-500 mt-1">Try searching for an order ID or seat code.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBlocks.map((block, idx) => {
              const isGenesis = block.blockIndex === 0;
              const isTargeted = highlightedOrderId && block.orderId?.toLowerCase().includes(highlightedOrderId.toLowerCase());

              return (
                <div
                  key={block.blockHash || idx}
                  className={`rounded-3xl border transition-all duration-200 overflow-hidden shadow-2xl backdrop-blur-md ${
                    isTargeted
                      ? 'bg-indigo-950/30 border-indigo-500 ring-2 ring-indigo-500/50'
                      : isGenesis
                      ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/40'
                  }`}
                >
                  {/* Block Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`w-9 h-9 rounded-xl font-mono font-black text-sm flex items-center justify-center border ${
                          isGenesis
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        }`}
                      >
                        #{block.blockIndex}
                      </span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-sm">
                            {isGenesis ? 'Genesis Master Contract Root' : block.eventName || 'Coldplay World Tour 2026'}
                          </span>
                          {isGenesis && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 border border-purple-800 text-purple-300 font-bold uppercase">
                              Genesis Block
                            </span>
                          )}
                          {isTargeted && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 border border-amber-800 text-amber-300 font-bold uppercase">
                              Your Ticket
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{block.timestamp ? new Date(block.timestamp).toLocaleString() : 'N/A'}</span>
                          <span className="text-slate-600">&bull;</span>
                          <span>Nonce: {block.nonce}</span>
                        </span>
                      </div>
                    </div>

                    {/* NFT Token Badge */}
                    <div className="flex items-center space-x-2 self-start sm:self-auto">
                      <span className="px-2.5 py-1 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center space-x-1.5">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span className="truncate max-w-[200px]">{block.tokenId || 'NFT-THEATRE-PASS'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Block Body */}
                  <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    {/* Seats & Attendee */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                        Seat Reservation
                      </span>
                      <div className="flex items-center space-x-2">
                        <Armchair className="w-4 h-4 text-amber-400" />
                        <span className="font-mono text-sm font-bold text-amber-300">
                          {block.seatNumbers || 'VIP-A01'}
                        </span>
                      </div>
                      <div className="pt-1 text-[11px] text-slate-400 border-t border-slate-850">
                        <span>Attendee: </span>
                        <strong className="text-white">{block.buyerName || 'Valued Patron'}</strong>
                        <span className="block text-slate-500 truncate">{block.buyerEmail || ''}</span>
                      </div>
                    </div>

                    {/* Hashes & Merkle Root */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 lg:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          Cryptographic SHA-256 Hash
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(block.blockHash)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1"
                        >
                          {copiedText === block.blockHash ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-400 break-all select-all">
                        {block.blockHash}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[10px] font-mono text-slate-400">
                        <div className="truncate">
                          <span className="text-slate-500">Prev Hash: </span>
                          <span className="text-slate-300">{block.previousHash?.substring(0, 16)}...</span>
                        </div>
                        <div className="truncate">
                          <span className="text-slate-500">Merkle Root: </span>
                          <span className="text-cyan-300">{block.merkleRoot?.substring(0, 16)}...</span>
                        </div>
                      </div>
                    </div>

                    {/* Smart Wallet Address & Settlement Reference */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-400">
                      <div className="flex items-center space-x-2">
                        <Wallet className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Buyer Wallet (Zero-Knowledge)</span>
                          <span className="font-mono text-slate-300 text-[11px]">{block.buyerWallet || '0x0000000000000000000000000000000000000000'}</span>
                        </div>
                      </div>

                      {block.paymentUtr && (
                        <div className="flex items-center space-x-2 self-start sm:self-auto font-mono text-[11px]">
                          <span className="text-slate-500">Bank UTR:</span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-bold">
                            {block.paymentUtr}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockchainExplorerPage;
