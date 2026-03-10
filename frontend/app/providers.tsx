'use client';

import { ReactNode } from 'react';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getEnabledChains } from '@/lib/networks';
import { useAutoFundLocal } from '@/lib/hooks/useAutoFundLocal';
import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
  appName: 'zkPredict',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: getEnabledChains(),
  ssr: true,
});

const queryClient = new QueryClient();

/** Runs hooks that need wagmi context */
function WagmiInit({ children }: { children: ReactNode }) {
  useAutoFundLocal();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#7c3aed',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            overlayBlur: 'small',
          })}
        >
          <WagmiInit>{children}</WagmiInit>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
