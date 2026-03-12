'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import { abis, useNetworkAddresses } from '@/lib/contracts';
import { getDefaultNetwork } from '@/lib/networks';
import { getAddressesByChainId } from '@/lib/networks/addresses';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Clock, CheckCircle2, AlertCircle, TrendingUp, ArrowRight } from 'lucide-react';

const GlobeHero = dynamic(() => import('@/app/components/ui/globe-hero').then(m => ({ default: m.GlobeHero })), { ssr: false, loading: () => <div className="min-h-[340px] flex items-center justify-center"><div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" /></div> });
const DatabaseWithRestApi = dynamic(() => import('@/app/components/ui/database-with-rest-api').then(m => ({ default: m.DatabaseWithRestApi })), { ssr: false });

export default function MarketsPage() {
  const { isConnected } = useAccount();
  const { market: marketAddress, chainId } = useNetworkAddresses();
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [resolutionTime, setResolutionTime] = useState('');
  const [status, setStatus] = useState('');

  const { writeContractAsync, isPending, data: txHash } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const connectedChainId = useChainId();
  useWaitForTransactionReceipt({ hash: txHash });

  const { data: marketCount, refetch: refetchMarketCount } = useReadContract({
    address: marketAddress,
    abi: abis.market,
    functionName: 'marketCount',
    chainId,
  });

  const handleCreateMarket = async () => {
    if (!question || !resolutionTime) {
      setStatus('Please fill in both fields');
      return;
    }
    try {
      // Always target the default chain (where contracts are deployed)
      const defaultNet = getDefaultNetwork();
      const targetChainId = defaultNet.chainId;
      const addr = getAddressesByChainId(targetChainId);

      if (!addr.market || addr.market === '0x0000000000000000000000000000000000000000') {
        setStatus('Error: No contract deployed on this network');
        return;
      }

      // Switch wallet to the correct chain if needed
      if (connectedChainId !== targetChainId) {
        setStatus(`Switching to ${defaultNet.label}...`);
        await switchChainAsync({ chainId: targetChainId });
      }

      setStatus('Sending transaction...');
      const unixSeconds = Math.floor(new Date(resolutionTime).getTime() / 1000);
      const hash = await writeContractAsync({
        address: addr.market,
        abi: abis.market,
        functionName: 'createMarket',
        args: [question, BigInt(unixSeconds)],
        chainId: targetChainId,
      });
      setStatus(`Tx sent! Hash: ${hash.slice(0, 18)}...`);
      setQuestion('');
      setResolutionTime('');
      const prevCount = marketCount;
      const poll = setInterval(async () => {
        const result = await refetchMarketCount();
        if (result.data !== prevCount) {
          setStatus('Market created successfully!');
          clearInterval(poll);
          setTimeout(() => { setShowCreate(false); setStatus(''); }, 2000);
        }
      }, 3000);
      setTimeout(() => clearInterval(poll), 60000);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setStatus(`Error: ${msg.slice(0, 120)}`);
    }
  };

  const count = Number(marketCount || 0);
  const marketIds = Array.from({ length: count }, (_, i) => i + 1).reverse();

  return (
    <div className="min-h-screen">
      {/* Globe Hero */}
      <GlobeHero
        title="Prediction Markets"
        subtitle="Create and trade on outcomes — powered by zero-knowledge proofs on Ethereum"
        className="min-h-[340px]"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Database Visualization */}
        <div className="mb-14 rounded-2xl border border-white/[0.06] bg-white/[0.01] p-8">
          <DatabaseWithRestApi
            title="On-Chain Flow"
            description="Every prediction follows a verifiable path through the smart contract"
            badges={[
              { label: "Create Market", color: "#8b5cf6" },
              { label: "Commit Hash", color: "#6366f1" },
              { label: "Submit ZK Proof", color: "#3b82f6" },
              { label: "Resolve Outcome", color: "#14b8a6" },
              { label: "Claim Winnings", color: "#10b981" },
            ]}
          />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Markets</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {count} market{count !== 1 ? 's' : ''} available
          </p>
        </div>
        {isConnected && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-all duration-300 hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Create Market
          </button>
        )}
      </div>

      {/* Create Market Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-zinc-900 p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Create New Market</h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Question</label>
                  <input
                    type="text"
                    placeholder="Will ETH reach $5,000 by end of 2026?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Resolution Time</label>
                  <input
                    type="datetime-local"
                    value={resolutionTime}
                    onChange={(e) => setResolutionTime(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition [color-scheme:dark]"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateMarket}
                disabled={isPending}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 transition-all duration-300"
              >
                {isPending ? 'Creating...' : 'Create Market'}
              </button>

              {status && (
                <p className="mt-3 text-xs text-center text-amber-400/80 break-all">{status}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Market Grid */}
      {count === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-5">
            <TrendingUp className="h-7 w-7 text-zinc-600" />
          </div>
          <h3 className="text-base font-semibold text-zinc-400 mb-1">No markets yet</h3>
          <p className="text-sm text-zinc-600 mb-6">Be the first to create a prediction market.</p>
          {isConnected && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.1] transition"
            >
              <Plus className="h-4 w-4" /> Create Market
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {marketIds.map((id, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
            >
              <MarketCard marketId={id} />
            </motion.div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function MarketCard({ marketId }: { marketId: number }) {
  const { market: marketAddress, chainId } = useNetworkAddresses();
  const { data: market } = useReadContract({
    address: marketAddress,
    abi: abis.market,
    functionName: 'getMarket',
    args: [BigInt(marketId)],
    chainId,
  });

  if (!market) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse">
        <div className="h-5 w-3/4 rounded bg-white/[0.06] mb-4" />
        <div className="h-4 w-1/2 rounded bg-white/[0.04] mb-2" />
        <div className="h-4 w-1/3 rounded bg-white/[0.04]" />
      </div>
    );
  }

  const [question, resolutionTime, outcome, resolved, totalYes, totalNo, totalPool, creator] = market as [string, bigint, bigint, boolean, bigint, bigint, bigint, string];
  const resolutionDate = new Date(Number(resolutionTime) * 1000);
  const now = new Date();
  const isActive = !resolved && resolutionDate > now;
  const isExpired = !resolved && resolutionDate <= now;

  let statusText = '';
  let statusDot = '';
  if (resolved) {
    statusText = 'Resolved';
    statusDot = 'bg-emerald-500';
  } else if (isActive) {
    statusText = 'Active';
    statusDot = 'bg-violet-500';
  } else if (isExpired) {
    statusText = 'Expired';
    statusDot = 'bg-red-500';
  }

  const StatusIcon = resolved ? CheckCircle2 : isActive ? Clock : AlertCircle;

  // Time remaining
  let timeLabel = '';
  if (isActive) {
    const diff = resolutionDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    timeLabel = days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;
  }

  return (
    <Link href={`/markets/${marketId}`} className="group block">
      <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
        {/* Status badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-400">
            <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
            {statusText}
          </div>
          <span className="text-xs text-zinc-600">#{marketId}</span>
        </div>

        <h3 className="text-base font-semibold text-white mb-3 line-clamp-2 group-hover:text-violet-300 transition-colors">
          {question}
        </h3>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <StatusIcon className="h-3.5 w-3.5" />
            {isActive ? timeLabel : resolutionDate.toLocaleDateString()}
          </div>

          {resolved && outcome > BigInt(0) && (
            <span className={`text-xs font-semibold ${outcome === BigInt(1) ? 'text-emerald-400' : 'text-red-400'}`}>
              {outcome === BigInt(1) ? 'YES' : 'NO'}
            </span>
          )}

          {isActive && (
            <span className="text-xs text-violet-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Predict <ArrowRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
