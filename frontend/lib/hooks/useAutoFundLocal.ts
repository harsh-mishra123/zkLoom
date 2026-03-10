'use client';

import { useEffect, useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';

const LOCAL_CHAIN_IDS = new Set([31337, 1337]);
const FUNDED_KEY = 'zkpredict_local_funded';

/**
 * Auto-funds the connected wallet on local networks (Hardhat/Ganache).
 * Uses hardhat_setBalance RPC to give the user 1000 ETH for testing.
 * Only runs once per address per session.
 */
export function useAutoFundLocal() {
  const { address } = useAccount();
  const chainId = useChainId();
  const funded = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!address || !LOCAL_CHAIN_IDS.has(chainId)) return;

    const key = `${chainId}:${address}`;
    // Skip if already funded this session
    if (funded.current.has(key)) return;

    // Skip if funded in a recent browser session
    try {
      const stored = JSON.parse(sessionStorage.getItem(FUNDED_KEY) || '[]');
      if (stored.includes(key)) { funded.current.add(key); return; }
    } catch {}

    // Fund: 1000 ETH in hex (0x3635C9ADC5DEA00000)
    const rpcUrl = chainId === 31337
      ? (process.env.NEXT_PUBLIC_LOCAL_RPC_URL || 'http://127.0.0.1:8545')
      : (process.env.NEXT_PUBLIC_GANACHE_RPC_URL || 'http://127.0.0.1:7545');

    fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'hardhat_setBalance',
        params: [address, '0x3635C9ADC5DEA00000'],
        id: Date.now(),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          funded.current.add(key);
          try {
            const stored = JSON.parse(sessionStorage.getItem(FUNDED_KEY) || '[]');
            stored.push(key);
            sessionStorage.setItem(FUNDED_KEY, JSON.stringify(stored));
          } catch {}
          console.log(`[dev] Funded ${address} with 1000 ETH on chain ${chainId}`);
        }
      })
      .catch(() => {});
  }, [address, chainId]);
}
