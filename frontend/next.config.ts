import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production env defaults — these are used when env vars are not set (e.g. on Vercel)
  // .env.local is gitignored, so Vercel builds won't have it.
  // These values are safe to commit (all NEXT_PUBLIC_ = client-visible).
  env: {
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '699f820832a7a831a01efc4cdc2e25d2',
    NEXT_PUBLIC_DEFAULT_CHAIN: process.env.NEXT_PUBLIC_DEFAULT_CHAIN || 'sepolia',
    NEXT_PUBLIC_DEFAULT_CHAIN_ID: process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || '11155111',
    NEXT_PUBLIC_SEPOLIA_MARKET_ADDRESS: process.env.NEXT_PUBLIC_SEPOLIA_MARKET_ADDRESS || '0x328882Fc63e88C4C1d7A1b3484C160De93b79c6D',
    NEXT_PUBLIC_SEPOLIA_VERIFIER_ADDRESS: process.env.NEXT_PUBLIC_SEPOLIA_VERIFIER_ADDRESS || '0xDd1Bc6a49b6c3Aced7a0b347895994f7E72d143A',
  },
  turbopack: {
    resolveAlias: {
      '@react-native-async-storage/async-storage': '',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
      },
      {
        protocol: 'https',
        hostname: 'html.tailus.io',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    if (!isServer) {
      // MetaMask SDK tries to import React Native modules that don't exist in web
      config.resolve.alias = {
        ...config.resolve.alias,
        '@react-native-async-storage/async-storage': false,
      };
    }
    return config;
  },
};

export default nextConfig;
