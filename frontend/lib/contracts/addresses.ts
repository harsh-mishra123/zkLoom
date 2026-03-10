// frontend/lib/contracts/addresses.ts
export const CONTRACT_ADDRESSES = {
    settlementVerifier: (process.env.NEXT_PUBLIC_SEPOLIA_VERIFIER_ADDRESS || '0xDd1Bc6a49b6c3Aced7a0b347895994f7E72d143A') as `0x${string}`,
    market: (process.env.NEXT_PUBLIC_SEPOLIA_MARKET_ADDRESS || '0x328882Fc63e88C4C1d7A1b3484C160De93b79c6D') as `0x${string}`,
} as const;

export const TARGET_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || '11155111') as number;

export const NETWORK_CONFIG = {
    local: {
        chainId: 31337,
        chainName: "Hardhat Local",
        rpcUrl: process.env.NEXT_PUBLIC_LOCAL_RPC_URL || "http://127.0.0.1:8545"
    },
    sepolia: {
        chainId: 11155111,
        chainName: "Sepolia",
        rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || ""
    }
} as const;