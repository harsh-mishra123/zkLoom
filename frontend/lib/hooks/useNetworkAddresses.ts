// ─── useNetworkAddresses ─────────────────────────────────────
// Returns the correct contract addresses + chainId for the
// currently connected chain (or the default chain if disconnected).
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { getAddressesByChainId, type ContractAddresses } from '@/lib/networks/addresses';
import { getDefaultNetwork } from '@/lib/networks/registry';

export interface NetworkAddresses extends ContractAddresses {
  /** chainId to pass to wagmi read hooks */
  chainId: number;
}

const ZERO: `0x${string}` = '0x0000000000000000000000000000000000000000';

/**
 * React hook that resolves contract addresses for the active chain.
 * If the connected chain has no deployed contracts (addresses are zero),
 * falls back to the default chain so reads/writes still work.
 */
export function useNetworkAddresses(): NetworkAddresses {
  const connectedChainId = useChainId();

  return useMemo(() => {
    // Try the connected chain first
    const addresses = getAddressesByChainId(connectedChainId);

    // If we got real addresses, use the connected chain
    if (addresses.market !== ZERO && addresses.settlementVerifier !== ZERO) {
      return { ...addresses, chainId: connectedChainId };
    }

    // No deployment on connected chain — fall back to default (e.g. hardhat)
    const defaultNet = getDefaultNetwork();
    const fallback = getAddressesByChainId(defaultNet.chainId);
    return { ...fallback, chainId: defaultNet.chainId };
  }, [connectedChainId]);
}
