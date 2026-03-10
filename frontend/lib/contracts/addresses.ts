// frontend/lib/contracts/addresses.ts
export const CONTRACT_ADDRESSES = {
    settlementVerifier: (process.env.NEXT_PUBLIC_HARDHAT_VERIFIER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    market: (process.env.NEXT_PUBLIC_HARDHAT_MARKET_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
} as const;

export const TARGET_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || '31337') as number;

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