import {
  type NetworkSlug,
  NETWORK_REGISTRY,
  getDefaultChainSlug,
  networkByChainId,
} from './registry';

export interface ContractAddresses {
  market: `0x${string}`;
  settlementVerifier: `0x${string}`;
}

const ZERO: `0x${string}` = '0x0000000000000000000000000000000000000000';

const FALLBACK_ADDRESSES: Partial<Record<NetworkSlug, ContractAddresses>> = {
  hardhat: {
    market: (process.env.NEXT_PUBLIC_HARDHAT_MARKET_ADDRESS as `0x${string}`) || ZERO,
    settlementVerifier: (process.env.NEXT_PUBLIC_HARDHAT_VERIFIER_ADDRESS as `0x${string}`) || ZERO,
  },
  sepolia: {
    market: (process.env.NEXT_PUBLIC_SEPOLIA_MARKET_ADDRESS as `0x${string}`) || '0x328882Fc63e88C4C1d7A1b3484C160De93b79c6D',
    settlementVerifier: (process.env.NEXT_PUBLIC_SEPOLIA_VERIFIER_ADDRESS as `0x${string}`) || '0xDd1Bc6a49b6c3Aced7a0b347895994f7E72d143A',
  },
};

const deploymentCache = new Map<NetworkSlug, ContractAddresses | null>();

function loadDeploymentJSON(slug: NetworkSlug): ContractAddresses | null {
  if (deploymentCache.has(slug)) return deploymentCache.get(slug)!;
  try {
    if (typeof window === 'undefined') return null;
    const global_deployments = (window as unknown as Record<string, unknown>).__ZK_DEPLOYMENTS as
      | Record<string, ContractAddresses>
      | undefined;
    if (global_deployments?.[slug]) {
      deploymentCache.set(slug, global_deployments[slug]);
      return global_deployments[slug];
    }
    return null;
  } catch {
    return null;
  }
}

function fromEnv(slug: NetworkSlug): ContractAddresses | null {
  const meta = NETWORK_REGISTRY[slug];
  if (!meta) return null;
  const prefix = meta.envPrefix;
  const market = process.env[`NEXT_PUBLIC_${prefix}_MARKET_ADDRESS`] as `0x${string}` | undefined;
  const verifier = process.env[`NEXT_PUBLIC_${prefix}_VERIFIER_ADDRESS`] as `0x${string}` | undefined;
  if (market && verifier) return { market, settlementVerifier: verifier };
  return null;
}

export function getAddresses(slug?: NetworkSlug): ContractAddresses {
  const target = slug ?? getDefaultChainSlug();
  const env = fromEnv(target);
  if (env) return env;
  const deployment = loadDeploymentJSON(target);
  if (deployment) return deployment;
  const fb = FALLBACK_ADDRESSES[target];
  if (fb) return fb;
  console.warn(`[addresses] No contract addresses found for network "${target}"`);
  return { market: ZERO, settlementVerifier: ZERO };
}

export function getAddressesByChainId(chainId: number): ContractAddresses {
  const meta = networkByChainId(chainId);
  return getAddresses(meta?.slug);
}

export async function loadDeployment(slug: NetworkSlug): Promise<ContractAddresses | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(`/deployments/${slug}.json`);
    if (!res.ok) return null;
    const data = (await res.json()) as ContractAddresses;
    deploymentCache.set(slug, data);
    return data;
  } catch {
    return null;
  }
}
