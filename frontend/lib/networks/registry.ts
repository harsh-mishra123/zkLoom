// ─── Network Registry ────────────────────────────────────────
// Single source of truth for every supported EVM network.
// All runtime values are read from NEXT_PUBLIC_* env vars.
// ─────────────────────────────────────────────────────────────

import {
  hardhat,
  sepolia,
  goerli,
  polygonMumbai,
  arbitrumGoerli,
  optimismGoerli,
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  zkSync,
} from 'wagmi/chains';
import type { Chain } from 'wagmi/chains';

// ─── Types ──────────────────────────────────────────────────

export type NetworkSlug =
  | 'hardhat'
  | 'ganache'
  | 'sepolia'
  | 'goerli'
  | 'mumbai'
  | 'arbitrum-goerli'
  | 'optimism-goerli'
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'zksync';

export type NetworkTier = 'local' | 'testnet' | 'mainnet';

export interface NetworkMeta {
  slug: NetworkSlug;
  chainId: number;
  tier: NetworkTier;
  label: string;
  chain: Chain;
  /** env‑var prefix for contract addresses (e.g. "HARDHAT") */
  envPrefix: string;
  /** Block explorer URL (if any) */
  explorerUrl?: string;
  /** Default number of confirmation blocks before treating tx as final */
  confirmations: number;
  /** Request timeout in ms */
  timeout: number;
  /** Native currency symbol */
  currency: string;
}

// ─── Custom chain definition for Ganache ────────────────────

const ganache: Chain = {
  id: 1337,
  name: 'Ganache',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_GANACHE_RPC_URL || 'http://127.0.0.1:7545'] },
  },
};

// ─── Registry ───────────────────────────────────────────────

export const NETWORK_REGISTRY: Record<NetworkSlug, NetworkMeta> = {
  // Local
  hardhat: {
    slug: 'hardhat', chainId: 31337, tier: 'local', label: 'Hardhat Local',
    chain: hardhat, envPrefix: 'HARDHAT', confirmations: 1, timeout: 5_000, currency: 'ETH',
  },
  ganache: {
    slug: 'ganache', chainId: 1337, tier: 'local', label: 'Ganache',
    chain: ganache, envPrefix: 'GANACHE', confirmations: 1, timeout: 5_000, currency: 'ETH',
  },

  // Testnets
  sepolia: {
    slug: 'sepolia', chainId: 11155111, tier: 'testnet', label: 'Sepolia',
    chain: sepolia, envPrefix: 'SEPOLIA', explorerUrl: 'https://sepolia.etherscan.io',
    confirmations: 2, timeout: 30_000, currency: 'ETH',
  },
  goerli: {
    slug: 'goerli', chainId: 5, tier: 'testnet', label: 'Goerli',
    chain: goerli, envPrefix: 'GOERLI', explorerUrl: 'https://goerli.etherscan.io',
    confirmations: 2, timeout: 30_000, currency: 'ETH',
  },
  mumbai: {
    slug: 'mumbai', chainId: 80001, tier: 'testnet', label: 'Polygon Mumbai',
    chain: polygonMumbai, envPrefix: 'MUMBAI', explorerUrl: 'https://mumbai.polygonscan.com',
    confirmations: 5, timeout: 30_000, currency: 'MATIC',
  },
  'arbitrum-goerli': {
    slug: 'arbitrum-goerli', chainId: 421613, tier: 'testnet', label: 'Arbitrum Goerli',
    chain: arbitrumGoerli, envPrefix: 'ARBITRUM_GOERLI', explorerUrl: 'https://goerli.arbiscan.io',
    confirmations: 2, timeout: 30_000, currency: 'ETH',
  },
  'optimism-goerli': {
    slug: 'optimism-goerli', chainId: 420, tier: 'testnet', label: 'Optimism Goerli',
    chain: optimismGoerli, envPrefix: 'OPTIMISM_GOERLI', explorerUrl: 'https://goerli-optimism.etherscan.io',
    confirmations: 2, timeout: 30_000, currency: 'ETH',
  },

  // Mainnets
  ethereum: {
    slug: 'ethereum', chainId: 1, tier: 'mainnet', label: 'Ethereum',
    chain: mainnet, envPrefix: 'ETHEREUM', explorerUrl: 'https://etherscan.io',
    confirmations: 5, timeout: 60_000, currency: 'ETH',
  },
  polygon: {
    slug: 'polygon', chainId: 137, tier: 'mainnet', label: 'Polygon',
    chain: polygon, envPrefix: 'POLYGON', explorerUrl: 'https://polygonscan.com',
    confirmations: 10, timeout: 60_000, currency: 'MATIC',
  },
  arbitrum: {
    slug: 'arbitrum', chainId: 42161, tier: 'mainnet', label: 'Arbitrum One',
    chain: arbitrum, envPrefix: 'ARBITRUM', explorerUrl: 'https://arbiscan.io',
    confirmations: 5, timeout: 60_000, currency: 'ETH',
  },
  optimism: {
    slug: 'optimism', chainId: 10, tier: 'mainnet', label: 'Optimism',
    chain: optimism, envPrefix: 'OPTIMISM', explorerUrl: 'https://optimistic.etherscan.io',
    confirmations: 5, timeout: 60_000, currency: 'ETH',
  },
  base: {
    slug: 'base', chainId: 8453, tier: 'mainnet', label: 'Base',
    chain: base, envPrefix: 'BASE', explorerUrl: 'https://basescan.org',
    confirmations: 5, timeout: 60_000, currency: 'ETH',
  },
  zksync: {
    slug: 'zksync', chainId: 324, tier: 'mainnet', label: 'zkSync Era',
    chain: zkSync, envPrefix: 'ZKSYNC', explorerUrl: 'https://explorer.zksync.io',
    confirmations: 5, timeout: 60_000, currency: 'ETH',
  },
};

// ─── Helpers ────────────────────────────────────────────────

/** Resolve the default chain slug from env. */
export function getDefaultChainSlug(): NetworkSlug {
  const raw = process.env.NEXT_PUBLIC_DEFAULT_CHAIN || 'hardhat';
  if (raw in NETWORK_REGISTRY) return raw as NetworkSlug;
  console.warn(`[network] Unknown NEXT_PUBLIC_DEFAULT_CHAIN="${raw}", falling back to hardhat`);
  return 'hardhat';
}

/** Get the NetworkMeta for the current default chain. */
export function getDefaultNetwork(): NetworkMeta {
  return NETWORK_REGISTRY[getDefaultChainSlug()];
}

/** Returns `true` when the given chainId belongs to a mainnet. */
export function isMainnet(chainId: number): boolean {
  return Object.values(NETWORK_REGISTRY).some(
    (n) => n.chainId === chainId && n.tier === 'mainnet',
  );
}

/** Lookup a NetworkMeta by chainId. */
export function networkByChainId(chainId: number): NetworkMeta | undefined {
  return Object.values(NETWORK_REGISTRY).find((n) => n.chainId === chainId);
}

/** Build the list of Chain objects that wagmi should know about. */
export function getEnabledChains(): [Chain, ...Chain[]] {
  const enableTestnets = process.env.NEXT_PUBLIC_ENABLE_TESTNETS !== 'false';
  const enableMainnets = process.env.NEXT_PUBLIC_ENABLE_MAINNETS === 'true';

  const chains: Chain[] = [];

  for (const meta of Object.values(NETWORK_REGISTRY)) {
    if (meta.tier === 'local') { chains.push(meta.chain); continue; }
    if (meta.tier === 'testnet' && enableTestnets) { chains.push(meta.chain); continue; }
    if (meta.tier === 'mainnet' && enableMainnets) { chains.push(meta.chain); continue; }
  }

  // Guarantee the default chain is first (wagmi uses first chain as default)
  const defaultMeta = getDefaultNetwork();
  const idx = chains.findIndex((c) => c.id === defaultMeta.chainId);
  if (idx > 0) {
    chains.splice(idx, 1);
    chains.unshift(defaultMeta.chain);
  } else if (idx === -1) {
    chains.unshift(defaultMeta.chain);
  }

  // wagmi requires at least one chain
  if (chains.length === 0) chains.push(hardhat);

  return chains as [Chain, ...Chain[]];
}
