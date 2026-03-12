export { CONTRACT_ADDRESSES } from './addresses';

export {
  getAddresses,
  getAddressesByChainId,
  getDefaultNetwork,
  getEnabledChains,
  NETWORK_REGISTRY,
  isMainnet,
  networkByChainId,
} from '../networks';

export { useNetworkAddresses } from '../hooks/useNetworkAddresses';

import marketAbi from '../abis/market.json';
import verifierAbi from '../abis/verifier.json';

export const abis = {
  market: marketAbi,
  settlementVerifier: verifierAbi,
} as const;
