'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Home, BarChart3, Trophy, Activity, Shield, Gavel } from 'lucide-react';
import dynamic from 'next/dynamic';
import { NetworkSelector } from './NetworkSelector';
import { useAccount, useReadContract } from 'wagmi';
import { abis, useNetworkAddresses } from '@/lib/contracts';

const DockNav = dynamic(() => import('./DockNav'), { ssr: false });

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/markets', label: 'Markets', icon: BarChart3 },
  { href: '/bets', label: 'My Bets', icon: Trophy },
  { href: '/activity', label: 'Activity', icon: Activity },
];

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { market: marketAddress, chainId } = useNetworkAddresses();
  const { data: contractOwner } = useReadContract({
    address: marketAddress,
    abi: abis.market,
    functionName: 'owner',
    chainId,
  });
  const isOwner = isConnected && address && contractOwner && address.toLowerCase() === (contractOwner as string).toLowerCase();
  const allNavLinks = isOwner ? [...navLinks, { href: '/admin', label: 'Admin', icon: Gavel }] : navLinks;

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-center py-3 px-4">
      {/* Background blur strip */}
      <div className="absolute inset-0 bg-[#09090b]/60 backdrop-blur-xl" />

      <div className="relative flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group mr-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
            <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="hidden sm:inline text-base font-semibold tracking-tight text-white">
            zk<span className="text-violet-400">Predict</span>
          </span>
        </Link>

        {/* Dock Navigation (lazy-loaded) */}
        <DockNav pathname={pathname} navLinks={allNavLinks} />

        {/* Network Selector */}
        <NetworkSelector />

        {/* Connect wallet button */}
        <div className="[&_button]:!rounded-lg [&_button]:!text-sm [&_button]:!font-medium [&_button]:!h-9 [&_button]:!px-4">
          <ConnectButton
            accountStatus="address"
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </div>
    </nav>
  );
}
