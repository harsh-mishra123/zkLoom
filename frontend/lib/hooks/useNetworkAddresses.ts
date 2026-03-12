import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { getAddressesByChainId, type ContractAddresses } from '@/lib/networks/addresses';
import { getDefaultNetwork, networkByChainId } from '@/lib/networks/registry';

export interface NetworkAddresses extends ContractAddresses {
  chainId: number;
}

const ZERO: `0x${string}` = '0x0000000000000000000000000000000000000000';
const LOCAL_CHAIN_IDS = new Set([31337, 1337]);

export function useNetworkAddresses(): NetworkAddresses {
  const connectedChainId = useChainId();

  return useMemo(() => {
    const defaultNet = getDefaultNetwork();
    const defaultAddresses = getAddressesByChainId(defaultNet.chainId);

    if (connectedChainId === defaultNet.chainId && defaultAddresses.market !== ZERO) {
      return { ...defaultAddresses, chainId: connectedChainId };
    }

    if (LOCAL_CHAIN_IDS.has(connectedChainId) && !LOCAL_CHAIN_IDS.has(defaultNet.chainId)) {
      return { ...defaultAddresses, chainId: defaultNet.chainId };
    }

    const addresses = getAddressesByChainId(connectedChainId);
    if (addresses.market !== ZERO && addresses.settlementVerifier !== ZERO) {
      return { ...addresses, chainId: connectedChainId };
    }

    return { ...defaultAddresses, chainId: defaultNet.chainId };
  }, [connectedChainId]);
}
