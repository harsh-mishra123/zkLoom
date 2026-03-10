export { CONTRACT_ADDRESSES, TARGET_CHAIN_ID } from './addresses';

// Re-export the full network system for new code
export {
  getAddresses,
  getAddressesByChainId,
  getDefaultNetwork,
  getEnabledChains,
  NETWORK_REGISTRY,
  isMainnet,
  networkByChainId,
} from '../networks';

// Re-export the chain-aware hook
export { useNetworkAddresses } from '../hooks/useNetworkAddresses';

import marketAbi from '../abis/market.json';
import verifierAbi from '../abis/verifier.json';

export const abis = {
  market: marketAbi,
  settlementVerifier: verifierAbi,
} as const;
