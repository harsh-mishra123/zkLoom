'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, Check, Wifi, WifiOff, Shield, TestTube, Wrench } from 'lucide-react';
import {
  NETWORK_REGISTRY,
  getEnabledChains,
  type NetworkMeta,
  type NetworkTier,
} from '@/lib/networks';

const tierIcon: Record<NetworkTier, typeof Globe> = {
  local: Wrench,
  testnet: TestTube,
  mainnet: Shield,
};

const tierLabel: Record<NetworkTier, string> = {
  local: 'Local',
  testnet: 'Testnets',
  mainnet: 'Mainnets',
};

export function NetworkSelector() {
  const { chain: activeChain, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState<Record<number, boolean>>({});

  // Build display list from enabled chains
  const enabledChainIds = new Set(getEnabledChains().map((c) => c.id));
  const networks = Object.values(NETWORK_REGISTRY).filter((n) =>
    enabledChainIds.has(n.chainId),
  );

  // Group by tier
  const grouped = networks.reduce<Record<NetworkTier, NetworkMeta[]>>(
    (acc, n) => { (acc[n.tier] ??= []).push(n); return acc; },
    {} as Record<NetworkTier, NetworkMeta[]>,
  );

  // Ping RPC health (lightweight: just eth_blockNumber)
  const checkHealth = useCallback(async () => {
    const results: Record<number, boolean> = {};
    await Promise.allSettled(
      networks.map(async (n) => {
        try {
          const url = n.chain.rpcUrls.default.http[0];
          if (!url) { results[n.chainId] = false; return; }
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          results[n.chainId] = res.ok;
        } catch {
          results[n.chainId] = false;
        }
      }),
    );
    setHealth(results);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    checkHealth();
    const iv = setInterval(checkHealth, 30_000);
    return () => clearInterval(iv);
  }, [checkHealth]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [open]);

  const current = activeChain
    ? networks.find((n) => n.chainId === activeChain.id)
    : undefined;

  if (!isConnected) return null;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.08] transition"
      >
        <span
          className={`h-2 w-2 rounded-full ${
            current ? (health[current.chainId] ? 'bg-emerald-500' : 'bg-red-500') : 'bg-yellow-500'
          }`}
        />
        <span className="max-w-[120px] truncate">
          {current?.label ?? activeChain?.name ?? 'Unknown'}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-white/[0.08] bg-zinc-900 p-1.5 shadow-2xl"
          >
            {(['local', 'testnet', 'mainnet'] as NetworkTier[]).map((tier) => {
              const items = grouped[tier];
              if (!items?.length) return null;
              const Icon = tierIcon[tier];
              return (
                <div key={tier} className="mb-1 last:mb-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    <Icon className="h-3 w-3" />
                    {tierLabel[tier]}
                  </div>
                  {items.map((n) => {
                    const isActive = activeChain?.id === n.chainId;
                    const isOnline = health[n.chainId];
                    return (
                      <button
                        key={n.chainId}
                        disabled={isPending || isActive}
                        onClick={() => {
                          switchChain({ chainId: n.chainId });
                          setOpen(false);
                        }}
                        className={`
                          flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition
                          ${isActive
                            ? 'bg-violet-500/10 text-violet-300'
                            : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'}
                        `}
                      >
                        <span className="flex items-center gap-2 flex-1 min-w-0">
                          {isOnline ? (
                            <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          ) : (
                            <WifiOff className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                          )}
                          <span className="truncate">{n.label}</span>
                          <span className="ml-auto text-[10px] text-zinc-600">{n.currency}</span>
                        </span>
                        {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-violet-400" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
