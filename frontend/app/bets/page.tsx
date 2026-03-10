'use client';

import { useAccount, useReadContract } from 'wagmi';
import { abis, useNetworkAddresses } from '@/lib/contracts';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, Clock, CheckCircle2, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

interface StoredPrediction {
  prediction: number;
  secret: string;
  txHash: string;
}

export default function BetsPage() {
  const { address, isConnected } = useAccount();
  const [storedBets, setStoredBets] = useState<Record<string, StoredPrediction>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { market: marketAddress, chainId } = useNetworkAddresses();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('zkpredict_secrets') || '{}');
    setStoredBets(stored);
  }, []);

  const { data: marketCount } = useReadContract({
    address: marketAddress,
    abi: abis.market,
    functionName: 'marketCount',
    chainId,
  });

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-5">
            <Trophy className="h-7 w-7 text-zinc-600" />
          </div>
          <h3 className="text-base font-semibold text-zinc-400 mb-1">Connect your wallet</h3>
          <p className="text-sm text-zinc-600">Connect your wallet to see your predictions.</p>
        </div>
      </div>
    );
  }

  const count = Number(marketCount || 0);
  const marketIds = Array.from({ length: count }, (_, i) => i + 1);

  // Filter to only markets where user has a bet stored locally
  const userBetMarkets = marketIds.filter((id) => {
    const key = `${id}_${address}`;
    return storedBets[key];
  });

  const copySecret = (key: string, secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">My Bets</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {userBetMarkets.length} prediction{userBetMarkets.length !== 1 ? 's' : ''} placed
        </p>
      </div>

      {userBetMarkets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-5">
            <Trophy className="h-7 w-7 text-zinc-600" />
          </div>
          <h3 className="text-base font-semibold text-zinc-400 mb-1">No predictions yet</h3>
          <p className="text-sm text-zinc-600 mb-6">Browse markets and make your first private prediction.</p>
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.1] transition"
          >
            Browse Markets
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {userBetMarkets.map((id, i) => {
            const key = `${id}_${address}`;
            const bet = storedBets[key];
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <BetRow
                  marketId={id}
                  bet={bet}
                  secretKey={key}
                  copiedKey={copiedKey}
                  onCopy={copySecret}
                />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BetRow({
  marketId,
  bet,
  secretKey,
  copiedKey,
  onCopy,
}: {
  marketId: number;
  bet: StoredPrediction;
  secretKey: string;
  copiedKey: string | null;
  onCopy: (key: string, secret: string) => void;
}) {
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
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
        <div className="h-5 w-2/3 rounded bg-white/[0.06]" />
      </div>
    );
  }

  const [question, resolutionTime, outcome, resolved, totalYes, totalNo, totalPool] = market as [string, bigint, bigint, boolean, bigint, bigint, bigint];
  const resolutionDate = new Date(Number(resolutionTime) * 1000);
  const isActive = !resolved && resolutionDate > new Date();

  let statusText = '', statusDot = '';
  const StatusIcon = resolved ? CheckCircle2 : isActive ? Clock : AlertCircle;
  if (resolved) { statusText = 'Resolved'; statusDot = 'bg-emerald-500'; }
  else if (isActive) { statusText = 'Active'; statusDot = 'bg-violet-500'; }
  else { statusText = 'Expired'; statusDot = 'bg-red-500'; }

  const won = resolved && outcome > BigInt(0) && Number(outcome) === bet.prediction + 1;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.03] transition">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Prediction badge */}
        <div className={`flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center text-sm font-bold ${
          bet.prediction === 1
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {bet.prediction === 1 ? 'YES' : 'NO'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link href={`/markets/${marketId}`} className="text-sm font-semibold text-white hover:text-violet-300 transition line-clamp-1">
            {question}
          </Link>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
              <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
              {statusText}
            </div>
            <span className="text-xs text-zinc-600">#{marketId}</span>
            {won && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
                <Trophy className="h-3 w-3" /> Winner
              </span>
            )}
          </div>
        </div>

        {/* Secret + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onCopy(secretKey, bet.secret)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.08] transition"
            title="Copy secret"
          >
            {copiedKey === secretKey ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copiedKey === secretKey ? 'Copied' : 'Secret'}
          </button>
          <Link
            href={`/markets/${marketId}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400 hover:bg-violet-500/20 transition"
          >
            <ExternalLink className="h-3 w-3" />
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
