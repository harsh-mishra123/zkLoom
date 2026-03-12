'use client';

import { useEffect, useState, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { abis, useNetworkAddresses } from '@/lib/contracts';
import { motion } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Zap,
  Fuel,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Shield,
  Flame,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { GlowingEffect } from '@/app/components/ui/glowing-effect';

// ─── Types ───────────────────────────────────────────────────
interface CoinPrice {
  usd: number;
  usd_24h_change: number;
  usd_24h_vol: number;
  usd_market_cap: number;
}

interface GasData {
  SafeGasPrice: string;
  ProposeGasPrice: string;
  FastGasPrice: string;
}

interface TrendingTopic {
  question: string;
  yesChance: number;
  volume: string;
  category: string;
}

// ─── Data fetchers (public APIs, no keys needed) ─────────────
async function fetchPrices(): Promise<Record<string, CoinPrice>> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,solana,polygon-ecosystem-token&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true',
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error('price fetch failed');
  return res.json();
}

async function fetchGas(): Promise<GasData | null> {
  try {
    const res = await fetch(
      'https://api.etherscan.io/api?module=gastracker&action=gasoracle',
      { cache: 'no-store' }
    );
    const json = await res.json();
    if (json.status === '1') return json.result;
    return null;
  } catch {
    return null;
  }
}

// ─── Trending prediction topics (curated, Polymarket-inspired) ───
const TRENDING_TOPICS: TrendingTopic[] = [
  { question: 'Will ETH surpass $5,000 by end of 2026?', yesChance: 42, volume: '$2.4M', category: 'Crypto' },
  { question: 'Will Bitcoin hit $150K before July 2026?', yesChance: 31, volume: '$8.1M', category: 'Crypto' },
  { question: 'Will Ethereum L2 TVL exceed $100B?', yesChance: 58, volume: '$1.2M', category: 'DeFi' },
  { question: 'Will a ZK-rollup process >10K TPS on mainnet?', yesChance: 23, volume: '$640K', category: 'Tech' },
  { question: 'Will SEC approve spot Solana ETF in 2026?', yesChance: 37, volume: '$3.7M', category: 'Regulation' },
  { question: 'Will DeFi total TVL surpass $500B?', yesChance: 45, volume: '$1.8M', category: 'DeFi' },
];

// ─── Helpers ─────────────────────────────────────────────────
function fmt(n: number, digits = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function fmtCompact(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

// ─── Main Page ───────────────────────────────────────────────
export default function ActivityPage() {
  const [prices, setPrices] = useState<Record<string, CoinPrice> | null>(null);
  const [gas, setGas] = useState<GasData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { market: marketAddress, chainId } = useNetworkAddresses();

  const { data: marketCount } = useReadContract({
    address: marketAddress,
    abi: abis.market,
    functionName: 'marketCount',
    chainId,
  });

  const count = Number(marketCount || 0);
  const marketIds = Array.from({ length: count }, (_, i) => i + 1).reverse();

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [priceData, gasData] = await Promise.all([fetchPrices(), fetchGas()]);
      setPrices(priceData);
      setGas(gasData);
      setLastUpdated(new Date());
    } catch {
      // keep stale data on error
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, [loadData]);

  const coins = [
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    { id: 'solana', symbol: 'SOL', name: 'Solana' },
    { id: 'polygon-ecosystem-token', symbol: 'POL', name: 'Polygon' },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Lamp Hero ── */}
      <LampHero />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 -mt-60 relative z-50">
        {/* ── Header row ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Live Activity</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Real-time crypto prices, gas, and prediction market trends
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-zinc-400 hover:bg-white/[0.06] transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
          </button>
        </div>

        {/* ── Live Price Ticker ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {coins.map((coin, i) => {
            const data = prices?.[coin.id];
            return (
              <motion.div
                key={coin.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <PriceCard coin={coin} data={data} />
              </motion.div>
            );
          })}
        </div>

        {/* ── Gas + Protocol Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-10">
          {/* Gas Tracker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="md:col-span-5"
          >
            <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/[0.08] p-2">
              <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
              <div className="relative h-full rounded-xl border-[0.75px] border-white/[0.06] bg-[#09090b] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Fuel className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white">Ethereum Gas Tracker</span>
                </div>
                {gas ? (
                  <div className="grid grid-cols-3 gap-4">
                    <GasTier label="Low" gwei={gas.SafeGasPrice} color="text-emerald-400" />
                    <GasTier label="Average" gwei={gas.ProposeGasPrice} color="text-amber-400" />
                    <GasTier label="Fast" gwei={gas.FastGasPrice} color="text-red-400" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((k) => (
                      <div key={k} className="animate-pulse">
                        <div className="h-3 w-12 rounded bg-white/[0.06] mb-2" />
                        <div className="h-6 w-16 rounded bg-white/[0.06]" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Protocol Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.4 }}
            className="md:col-span-7"
          >
            <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/[0.08] p-2">
              <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
              <div className="relative h-full rounded-xl border-[0.75px] border-white/[0.06] bg-[#09090b] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Shield className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-medium text-white">Protocol Overview</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCell label="Total Markets" value={count.toString()} icon={<BarChart3 className="h-3.5 w-3.5" />} />
                  <StatCell label="Network" value="Sepolia" icon={<Globe className="h-3.5 w-3.5" />} />
                  <StatCell label="Protocol" value="Commit-Reveal" icon={<Shield className="h-3.5 w-3.5" />} />
                  <StatCell label="Proof System" value="Groth16" icon={<Zap className="h-3.5 w-3.5" />} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Trending Predictions (Polymarket-style) ── */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Flame className="h-4 w-4 text-orange-400" />
            <h2 className="text-lg font-semibold text-white">Trending Predictions</h2>
            <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400 uppercase tracking-wider">
              Polymarket-inspired
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TRENDING_TOPICS.map((topic, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.06, duration: 0.35 }}
              >
                <TrendingCard topic={topic} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Market Timeline ── */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-1">Market Timeline</h2>
          <p className="text-sm text-zinc-500">All on-chain markets by recency</p>
        </div>

        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-14 w-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
              <Activity className="h-6 w-6 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">No on-chain activity yet</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-white/[0.06]" />
            <div className="space-y-4">
              {marketIds.map((id, i) => (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <TimelineItem marketId={id} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── How It Works ── */}
        <div className="mt-16">
          <div className="relative rounded-[1.25rem] border-[0.75px] border-white/[0.08] p-2">
            <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
            <div className="relative rounded-xl border-[0.75px] border-white/[0.06] bg-[#09090b] p-8">
              <h3 className="text-base font-semibold text-white mb-6">How zkPredict Works</h3>
              <div className="grid sm:grid-cols-3 gap-6 text-sm text-zinc-400">
                <div>
                  <p className="text-white font-medium mb-1">1. Commit Phase</p>
                  <p>Users submit a Poseidon hash of their prediction + secret. The actual prediction stays hidden on-chain.</p>
                </div>
                <div>
                  <p className="text-white font-medium mb-1">2. Resolution</p>
                  <p>The market creator or oracle resolves the market with the actual outcome (YES/NO).</p>
                </div>
                <div>
                  <p className="text-white font-medium mb-1">3. Reveal & Claim</p>
                  <p>Users reveal with a ZK proof (Groth16). Correct predictions share the losing pool proportionally.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Lamp Hero (inline, small version) ───────────────────────
function LampHero() {
  return (
    <div className="relative flex h-[28rem] flex-col items-center justify-center overflow-hidden bg-slate-950 w-full z-0">
      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0">
        <motion.div
          initial={{ opacity: 0.5, width: '15rem' }}
          whileInView={{ opacity: 1, width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          style={{ backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))` }}
          className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] bg-gradient-conic from-cyan-500 via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
        >
          <div className="absolute w-full left-0 bg-slate-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-40 h-full left-0 bg-slate-950 bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0.5, width: '15rem' }}
          whileInView={{ opacity: 1, width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          style={{ backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))` }}
          className="absolute inset-auto left-1/2 h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-cyan-500 text-white [--conic-position:from_290deg_at_center_top]"
        >
          <div className="absolute w-40 h-full right-0 bg-slate-950 bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute w-full right-0 bg-slate-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-slate-950 blur-2xl" />
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />
        <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-cyan-500 opacity-50 blur-3xl" />
        <motion.div
          initial={{ width: '8rem' }}
          whileInView={{ width: '16rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-auto z-30 h-36 w-64 -translate-y-[6rem] rounded-full bg-cyan-400 blur-2xl"
        />
        <motion.div
          initial={{ width: '15rem' }}
          whileInView={{ width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[7rem] bg-cyan-400"
        />
        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-slate-950" />
      </div>

      <div className="relative z-50 flex -translate-y-72 flex-col items-center px-5">
        <motion.h1
          initial={{ opacity: 0.5, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="bg-gradient-to-br from-slate-200 to-slate-400 py-4 bg-clip-text text-center text-3xl sm:text-5xl font-bold tracking-tight text-transparent"
        >
          Activity Feed
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: 'easeInOut' }}
          className="text-sm text-zinc-500 mt-2"
        >
          Live prices &bull; Gas tracker &bull; Prediction trends
        </motion.p>
      </div>
    </div>
  );
}

// ─── Price Card ──────────────────────────────────────────────
function PriceCard({
  coin,
  data,
}: {
  coin: { id: string; symbol: string; name: string };
  data?: CoinPrice;
}) {
  const change = data?.usd_24h_change ?? 0;
  const isUp = change >= 0;

  return (
    <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/[0.08] p-2">
      <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
      <div className="relative h-full rounded-xl border-[0.75px] border-white/[0.06] bg-[#09090b] p-5">
        {data ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{coin.symbol}</span>
                <span className="text-xs text-zinc-600">{coin.name}</span>
              </div>
              <span
                className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}
              >
                {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(change).toFixed(2)}%
              </span>
            </div>
            <p className="text-2xl font-bold text-white mb-2">${fmt(data.usd)}</p>
            <div className="flex items-center justify-between text-[11px] text-zinc-600">
              <span>Vol: {fmtCompact(data.usd_24h_vol)}</span>
              <span>MCap: {fmtCompact(data.usd_market_cap)}</span>
            </div>
          </>
        ) : (
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-16 rounded bg-white/[0.06]" />
            <div className="h-7 w-28 rounded bg-white/[0.06]" />
            <div className="h-3 w-full rounded bg-white/[0.06]" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Gas Tier ────────────────────────────────────────────────
function GasTier({ label, gwei, color }: { label: string; gwei: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-[11px] text-zinc-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{gwei}</p>
      <p className="text-[10px] text-zinc-600">Gwei</p>
    </div>
  );
}

// ─── Stat Cell ───────────────────────────────────────────────
function StatCell({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-zinc-500 mb-1.5">{icon}<span className="text-[11px]">{label}</span></div>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

// ─── Trending Card (Polymarket-style) ────────────────────────
function TrendingCard({ topic }: { topic: TrendingTopic }) {
  return (
    <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/[0.08] p-2">
      <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
      <div className="relative flex h-full flex-col justify-between rounded-xl border-[0.75px] border-white/[0.06] bg-[#09090b] p-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-zinc-400">
              {topic.category}
            </span>
            <span className="text-[10px] text-zinc-600">Vol {topic.volume}</span>
          </div>
          <p className="text-sm font-medium text-white leading-snug mb-4">{topic.question}</p>
        </div>
        <div>
          {/* Probability bar */}
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-emerald-400 font-medium">Yes {topic.yesChance}%</span>
            <span className="text-red-400 font-medium">No {100 - topic.yesChance}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-red-500/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${topic.yesChance}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Timeline Item ───────────────────────────────────────────
function TimelineItem({ marketId }: { marketId: number }) {
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
      <div className="ml-10 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 animate-pulse">
        <div className="h-4 w-2/3 rounded bg-white/[0.06]" />
      </div>
    );
  }

  const [question, resolutionTime, outcome, resolved] = market as [string, bigint, bigint, boolean, bigint, bigint, bigint, string];
  const resolutionDate = new Date(Number(resolutionTime) * 1000);
  const isActive = !resolved && resolutionDate > new Date();

  let dotColor = 'bg-zinc-600';
  if (resolved) dotColor = 'bg-emerald-500';
  else if (isActive) dotColor = 'bg-violet-500';
  else dotColor = 'bg-red-500';

  return (
    <div className="relative flex items-start gap-4 pl-10">
      <div className={`absolute left-[14px] top-5 h-2.5 w-2.5 rounded-full ${dotColor} ring-4 ring-[#09090b]`} />

      <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.03] transition">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white line-clamp-1">{question}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-zinc-600">#{marketId}</span>
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock className="h-3 w-3" />
                {resolutionDate.toLocaleDateString()}
              </span>
            </div>
          </div>

          <span
            className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              resolved
                ? 'bg-emerald-500/10 text-emerald-400'
                : isActive
                  ? 'bg-violet-500/10 text-violet-400'
                  : 'bg-red-500/10 text-red-400'
            }`}
          >
            {resolved
              ? outcome === BigInt(1)
                ? 'YES'
                : outcome === BigInt(2)
                  ? 'NO'
                  : 'Resolved'
              : isActive
                ? 'Active'
                : 'Expired'}
          </span>
        </div>
      </div>
    </div>
  );
}
