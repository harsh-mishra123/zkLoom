// ─── useNetworkAddresses ─────────────────────────────────────
// Returns the correct contract addresses + chainId for the
// currently connected chain (or the default chain if disconnected).
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { getAddressesByChainId, type ContractAddresses } from '@/lib/networks/addresses';
import { getDefaultNetwork, networkByChainId } from '@/lib/networks/registry';

export interface NetworkAddresses extends ContractAddresses {
  /** chainId to pass to wagmi read hooks */
  chainId: number;
}

const ZERO: `0x${string}` = '0x0000000000000000000000000000000000000000';
const LOCAL_CHAIN_IDS = new Set([31337, 1337]);

/**
 * React hook that resolves contract addresses for the active chain.
 * Always prefers the default chain (from env). Only uses the connected
 * chain if it has real deployments AND is not an unreachable local chain.
 */
export function useNetworkAddresses(): NetworkAddresses {
  const connectedChainId = useChainId();

  return useMemo(() => {
    const defaultNet = getDefaultNetwork();
    const defaultAddresses = getAddressesByChainId(defaultNet.chainId);

    // If wallet is already on the default chain and it has addresses, use it
    if (connectedChainId === defaultNet.chainId && defaultAddresses.market !== ZERO) {
      return { ...defaultAddresses, chainId: connectedChainId };
    }

    // If wallet is on a local chain but default is NOT local, skip local
    // (the local hardhat node is likely not running)
    if (LOCAL_CHAIN_IDS.has(connectedChainId) && !LOCAL_CHAIN_IDS.has(defaultNet.chainId)) {
      return { ...defaultAddresses, chainId: defaultNet.chainId };
    }

    // Try the connected chain (only non-local or when default is also local)
    const addresses = getAddressesByChainId(connectedChainId);
    if (addresses.market !== ZERO && addresses.settlementVerifier !== ZERO) {
      return { ...addresses, chainId: connectedChainId };
    }

    // Fall back to default chain
    return { ...defaultAddresses, chainId: defaultNet.chainId };
  }, [connectedChainId]);
}
