'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useSwitchChain, useChainId } from 'wagmi';
import { abis, useNetworkAddresses } from '@/lib/contracts';
import { getAddressesByChainId } from '@/lib/networks/addresses';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Gavel,
  Loader2,
  TrendingUp,
  Users,
  Coins,
  Lock,
} from 'lucide-react';

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { market: marketAddress, chainId } = useNetworkAddresses();

  // Read contract owner
  const { data: contractOwner } = useReadContract({
    address: marketAddress,
    abi: abis.market,
    functionName: 'owner',
    chainId,
  });

  // Read market count
  const { data: marketCount } = useReadContract({
    address: marketAddress,
    abi: abis.market,
    functionName: 'marketCount',
    chainId,
  });

  const owner = contractOwner as `0x${string}` | undefined;
  const isOwner = isConnected && address && owner && address.toLowerCase() === owner.toLowerCase();
  const count = Number(marketCount || 0);

  // Not connected state
  if (!isConnected) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/markets" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Markets
        </Link>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Lock className="h-12 w-12 text-zinc-600 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
          <p className="text-sm text-zinc-500">Connect your wallet to access the admin panel.</p>
        </div>
      </div>
    );
  }

  // Not owner state
  if (!isOwner) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/markets" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Markets
        </Link>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldAlert className="h-12 w-12 text-red-500/60 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-sm text-zinc-500 mb-1">Only the contract owner can resolve markets.</p>
          <p className="text-xs text-zinc-600 font-mono mt-2">
            Owner: {owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : 'Loading...'}
          </p>
          <p className="text-xs text-zinc-600 font-mono">
            You: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
          </p>
        </div>
      </div>
    );
  }

  const marketIds = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/markets" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition mb-8">
        <ArrowLeft className="h-4 w-4" /> Back to Markets
      </Link>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-zinc-500 font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
          </div>
        </div>
        <p className="text-sm text-zinc-500 mt-2 mb-8">
          Resolve expired markets by setting the final outcome. This determines winners and triggers payouts.
        </p>
      </motion.div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard icon={TrendingUp} label="Total Markets" value={count.toString()} color="violet" delay={0.05} />
        <MarketStatCount marketIds={marketIds} type="active" />
        <MarketStatCount marketIds={marketIds} type="expired" />
        <MarketStatCount marketIds={marketIds} type="resolved" />
      </div>

      {/* Market list */}
      {count === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <TrendingUp className="h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-400">No markets created yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {marketIds.map((id, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.03, duration: 0.35 }}
            >
              <AdminMarketRow marketId={id} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color, delay }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  const colorMap: Record<string, string> = {
    violet: 'text-violet-400 bg-violet-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    red: 'text-red-400 bg-red-500/10',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
    >
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg mb-2 ${colorMap[color] || colorMap.violet}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </motion.div>
  );
}

/* ─── Market row stat counters (need to read each market) ──── */

function MarketStatCount({ marketIds, type }: { marketIds: number[]; type: 'active' | 'expired' | 'resolved' }) {
  // This is a simple wrapper; actual value computed in parent via children
  const iconMap = {
    active: { icon: Clock, label: 'Active', color: 'violet' },
    expired: { icon: AlertCircle, label: 'Needs Resolution', color: 'amber' },
    resolved: { icon: CheckCircle2, label: 'Resolved', color: 'emerald' },
  };
  const { icon, label, color } = iconMap[type];
  // For simplicity, we just display "-" and let the rows handle it
  // In a production app, you'd aggregate from a subgraph
  return <StatCard icon={icon} label={label} value="—" color={color} delay={type === 'active' ? 0.1 : type === 'expired' ? 0.15 : 0.2} />;
}

/* ─── Admin Market Row ──────────────────────────────────────── */

function AdminMarketRow({ marketId }: { marketId: number }) {
  const { market: marketAddress, chainId } = useNetworkAddresses();
  const { writeContractAsync, isPending } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const connectedChainId = useChainId();

  const [resolveStatus, setResolveStatus] = useState('');
  const [showConfirm, setShowConfirm] = useState<1 | 2 | null>(null);

  const { data: market, refetch: refetchMarket } = useReadContract({
    address: marketAddress,
    abi: abis.market,
    functionName: 'getMarket',
    args: [BigInt(marketId)],
    chainId,
  });

  if (!market) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
        <div className="h-5 w-2/3 rounded bg-white/[0.06]" />
      </div>
    );
  }

  const [question, resolutionTime, outcome, resolved, totalYes, totalNo, totalPool] = market as [string, bigint, bigint, boolean, bigint, bigint, bigint];
  const resolutionDate = new Date(Number(resolutionTime) * 1000);
  const now = new Date();
  const isActive = !resolved && resolutionDate > now;
  const isExpired = !resolved && resolutionDate <= now;
  // Show resolve buttons for ALL unresolved markets — the contract
  // enforces block.timestamp >= resolutionTime and will revert if too early.
  // This avoids wall-clock vs blockchain-time mismatches (e.g. Hardhat fast-forward).
  const canResolve = !resolved;

  const handleResolve = async (outcomeValue: 1 | 2) => {
    try {
      setResolveStatus('Sending transaction...');
      const targetChainId = chainId;
      if (connectedChainId !== targetChainId) {
        setResolveStatus('Switching network...');
        await switchChainAsync({ chainId: targetChainId });
      }
      const addr = getAddressesByChainId(targetChainId);
      await writeContractAsync({
        address: addr.market,
        abi: abis.market,
        functionName: 'resolveMarket',
        args: [BigInt(marketId), BigInt(outcomeValue)],
        chainId: targetChainId,
      });
      setResolveStatus('Market resolved!');
      setShowConfirm(null);
      setTimeout(() => { refetchMarket(); setResolveStatus(''); }, 3000);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setResolveStatus(`Error: ${msg.slice(0, 120)}`);
      setShowConfirm(null);
    }
  };

  // Status styling
  let statusText = '', statusColor = '', borderColor = '';
  if (resolved) {
    statusText = `Resolved: ${outcome === BigInt(1) ? 'YES' : 'NO'}`;
    statusColor = 'text-emerald-400 bg-emerald-500/10';
    borderColor = 'border-emerald-500/20';
  } else if (isExpired) {
    statusText = 'Awaiting Resolution';
    statusColor = 'text-amber-400 bg-amber-500/10';
    borderColor = 'border-amber-500/30';
  } else {
    statusText = 'Active (Unresolved)';
    statusColor = 'text-violet-400 bg-violet-500/10';
    borderColor = 'border-violet-500/20';
  }

  return (
    <div className={`rounded-xl border bg-white/[0.02] p-5 ${!resolved ? borderColor : 'border-white/[0.06]'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Market info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
              {resolved ? <CheckCircle2 className="h-3 w-3" /> : canResolve ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {statusText}
            </span>
            <span className="text-xs text-zinc-600">#{marketId}</span>
          </div>

          <Link href={`/markets/${marketId}`} className="text-sm font-semibold text-white hover:text-violet-300 transition-colors">
            {question}
          </Link>

          <div className="flex flex-wrap gap-4 mt-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {resolutionDate.toLocaleDateString()} {resolutionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {(Number(totalPool) / 1e18).toFixed(4)} ETH pool
            </span>
            {totalPool > BigInt(0) && (
              <>
                <span className="text-emerald-400/70">YES: {(Number(totalYes) / 1e18).toFixed(4)}</span>
                <span className="text-red-400/70">NO: {(Number(totalNo) / 1e18).toFixed(4)}</span>
              </>
            )}
          </div>
        </div>

        {/* Resolve buttons */}
        {canResolve && (
          <div className="flex flex-col gap-2 sm:items-end shrink-0">
            <AnimatePresence mode="wait">
              {showConfirm === null ? (
                <motion.div key="buttons" className="flex gap-2" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <button
                    onClick={() => setShowConfirm(1)}
                    disabled={isPending}
                    className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-40"
                  >
                    <Gavel className="h-3 w-3 inline mr-1.5" />
                    Resolve YES
                  </button>
                  <button
                    onClick={() => setShowConfirm(2)}
                    disabled={isPending}
                    className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-40"
                  >
                    <Gavel className="h-3 w-3 inline mr-1.5" />
                    Resolve NO
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-xs text-zinc-400">
                    Set outcome to <strong className={showConfirm === 1 ? 'text-emerald-400' : 'text-red-400'}>
                      {showConfirm === 1 ? 'YES' : 'NO'}
                    </strong>?
                  </span>
                  <button
                    onClick={() => handleResolve(showConfirm)}
                    disabled={isPending}
                    className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.1] transition disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowConfirm(null)}
                    className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:text-white transition"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Resolved badge */}
        {resolved && (
          <div className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold ${
            outcome === BigInt(1) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {outcome === BigInt(1) ? 'YES' : 'NO'}
          </div>
        )}
      </div>

      {/* Status message */}
      {resolveStatus && (
        <p className="mt-3 text-xs text-amber-400/80 break-all">{resolveStatus}</p>
      )}
    </div>
  );
}
