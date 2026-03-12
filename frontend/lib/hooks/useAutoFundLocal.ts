import { useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';

const LOCAL_CHAIN_IDS = new Set([31337, 1337]);

/**
 * Auto-funds the connected wallet on local dev chains (Hardhat / Ganache).
 * No-op on testnets and mainnets.
 */
export function useAutoFundLocal() {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected || !address || !LOCAL_CHAIN_IDS.has(chainId)) return;

    const rpcUrl =
      chainId === 1337
        ? process.env.NEXT_PUBLIC_GANACHE_RPC_URL || 'http://127.0.0.1:7545'
        : 'http://127.0.0.1:8545';

    // Fund the wallet with 1000 ETH via hardhat_setBalance / evm_setAccountBalance
    const amount = '0x' + (BigInt('1000000000000000000000') ).toString(16); // 1000 ETH

    fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'hardhat_setBalance',
        params: [address, amount],
        id: 1,
      }),
    }).catch(() => {
      // Silently fail — node might not be running
    });
  }, [chainId, address, isConnected]);
}
