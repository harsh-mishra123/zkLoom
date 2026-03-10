'use client';

import { useParams } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useSwitchChain, useChainId } from 'wagmi';
import { abis, useNetworkAddresses } from '@/lib/contracts';
import { getAddressesByChainId } from '@/lib/networks/addresses';
import { getDefaultNetwork } from '@/lib/networks';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { parseEther } from 'viem';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Lock, Copy, Check, Shield, Loader2, Trophy, XCircle, Coins, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

async function computeCommitment(prediction: number, secret: string, marketId: number): Promise<bigint> {
  const { buildPoseidon } = await import('circomlibjs');
  const poseidon = await buildPoseidon();
  const secretBytes = new TextEncoder().encode(secret);
  let secretNum = BigInt(0);
  for (let i = 0; i < secretBytes.length; i++) {
    secretNum = (secretNum * BigInt(256) + BigInt(secretBytes[i])) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  }
  const hash1 = poseidon([BigInt(prediction), secretNum]);
  const hash2 = poseidon([poseidon.F.toObject(hash1), BigInt(marketId)]);
  return poseidon.F.toObject(hash2);
}

export default function MarketDetail() {
  const params = useParams();
  const marketId = params.id ? Number(params.id) : 0;
  const { address, isConnected } = useAccount();
  const { market: marketAddress, chainId } = useNetworkAddresses();

  const [prediction, setPrediction] = useState<number | null>(null);
  const [secret, setSecret] = useState('');
  const [betAmount, setBetAmount] = useState('');
  const [status, setStatus] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  const { writeContractAsync, isPending } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const connectedChainId = useChainId();

  const { data: market } = useReadContract({
    address: marketAddress,
    abi: abis.market,
    functionName: 'getMarket',
    args: [BigInt(marketId)],
    chainId,
  });

  const { data: userPrediction, refetch: refetchPrediction } = useReadContract({
    address: marketAddress,
    abi: abis.market,
    functionName: 'getUserPrediction',
    args: [BigInt(marketId), address as `0x${string}`],
    chainId,
  });

  // Read potential payout from contract
  const { data: payoutData, refetch: refetchPayout } = useReadContract({
    address: marketAddress,
    abi: abis.market,
    functionName: 'calculatePayout',
    args: [BigInt(marketId), address as `0x${string}`],
    chainId,
  });

  // Load user's stored prediction from localStorage
  const [storedBet, setStoredBet] = useState<{ prediction: number; secret: string } | null>(null);
  useEffect(() => {
    if (!address) return;
    const stored = JSON.parse(localStorage.getItem('zkpredict_secrets') || '{}');
    const data = stored[`${marketId}_${address}`];
    if (data) setStoredBet({ prediction: data.prediction, secret: data.secret });
  }, [address, marketId]);

  useEffect(() => {
    const randomSecret = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    setSecret(randomSecret);
  }, []);

  const handleCommitPrediction = async () => {
    if (prediction === null) { setStatus('Please select YES or NO'); return; }
    if (!betAmount || parseFloat(betAmount) <= 0) { setStatus('Please enter a bet amount'); return; }
    try {
      setStatus('Computing commitment hash...');
      const commitment = await computeCommitment(prediction, secret, marketId);
      // Always target the default chain (where contracts are deployed)
      const defaultNet = getDefaultNetwork();
      const targetChainId = defaultNet.chainId;
      if (connectedChainId !== targetChainId) {
        setStatus(`Switching to ${defaultNet.label}...`);
        await switchChainAsync({ chainId: targetChainId });
      }
      // Resolve address fresh
      const addr = getAddressesByChainId(targetChainId);
      setStatus('Sending transaction...');
      const hash = await writeContractAsync({
        address: addr.market,
        abi: abis.market,
        functionName: 'commitPrediction',
        args: [BigInt(marketId), commitment, prediction === 1],
        value: parseEther(betAmount),
        chainId: targetChainId,
      });
      setStatus('Prediction committed! Save your secret.');
      const stored = JSON.parse(localStorage.getItem('zkpredict_secrets') || '{}');
      stored[`${marketId}_${address}`] = { prediction, secret, txHash: hash };
      localStorage.setItem('zkpredict_secrets', JSON.stringify(stored));
      setTimeout(() => refetchPrediction(), 5000);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error committing prediction:', error);
      setStatus(`Error: ${msg.slice(0, 150)}`);
    }
  };

  const [revealStatus, setRevealStatus] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);

  const handleRevealAndClaim = async () => {
    if (!address) return;
    try {
      setIsRevealing(true);
      setRevealStatus('Loading stored secret...');

      // Retrieve stored prediction data
      const stored = JSON.parse(localStorage.getItem('zkpredict_secrets') || '{}');
      const data = stored[`${marketId}_${address}`];
      if (!data) {
        setRevealStatus('Error: No stored secret found. Did you commit from this browser?');
        setIsRevealing(false);
        return;
      }

      const { prediction: storedPrediction, secret: storedSecret } = data;

      // Convert secret to field element (same as computeCommitment)
      const secretBytes = new TextEncoder().encode(storedSecret);
      let secretNum = BigInt(0);
      for (let i = 0; i < secretBytes.length; i++) {
        secretNum = (secretNum * BigInt(256) + BigInt(secretBytes[i])) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
      }

      setRevealStatus('Generating ZK proof (this may take a moment)...');

      // Build circuit inputs
      const circuitInputs = {
        commitment: userCommitment.toString(),
        marketOutcome: outcome.toString(),
        marketId: marketId.toString(),
        prediction: storedPrediction.toString(),
        secret: secretNum.toString(),
      };

      // Generate proof using snarkjs
      const snarkjs = await import('snarkjs');
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInputs,
        '/circuits/settlement.wasm',
        '/circuits/settlement_final.zkey'
      );

      // Format proof for Solidity calldata
      const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
      const calldataArgs = JSON.parse('[' + calldata + ']');
      const [pA, pB, pC, pubSignals] = calldataArgs;

      // Ensure wallet is on the right chain
      const defaultNet = getDefaultNetwork();
      const targetChainId = defaultNet.chainId;
      if (connectedChainId !== targetChainId) {
        setRevealStatus(`Switching to ${defaultNet.label}...`);
        await switchChainAsync({ chainId: targetChainId });
      }

      const addr = getAddressesByChainId(targetChainId);
      setRevealStatus('Submitting proof on-chain...');

      await writeContractAsync({
        address: addr.market,
        abi: abis.market,
        functionName: 'revealAndClaim',
        args: [BigInt(marketId), pA, pB, pC, pubSignals],
        chainId: targetChainId,
      });

      setRevealStatus('Revealed successfully! Payout sent if you won.');
      setTimeout(() => { refetchPrediction(); refetchPayout(); }, 5000);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error revealing:', error);
      setRevealStatus(`Error: ${msg.slice(0, 200)}`);
    } finally {
      setIsRevealing(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // Loading state
  if (!market) return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="animate-pulse space-y-6">
        <div className="h-5 w-24 rounded bg-white/[0.06]" />
        <div className="h-8 w-2/3 rounded bg-white/[0.06]" />
        <div className="h-40 rounded-2xl bg-white/[0.03]" />
      </div>
    </div>
  );

  const [question, resolutionTime, outcome, resolved, totalYes, totalNo, totalPool] = market as [string, bigint, bigint, boolean, bigint, bigint, bigint];
  const [userCommitment, userAmount, userSide, userRevealed, userClaimed] = (userPrediction as [bigint, bigint, boolean, boolean, boolean]) || [BigInt(0), BigInt(0), false, false, false];
  const payout = payoutData as bigint | undefined;

  // Determine win/loss status
  const userDidWin = resolved && userRevealed && userSide === (outcome === BigInt(1));
  const userDidLose = resolved && userRevealed && !userDidWin;
  const predictedLabel = storedBet ? (storedBet.prediction === 1 ? 'YES' : 'NO') : (userSide ? 'YES' : 'NO');
  const outcomeLabel = outcome === BigInt(1) ? 'YES' : outcome === BigInt(2) ? 'NO' : 'Pending';

  const resolutionDate = new Date(Number(resolutionTime) * 1000);
  const now = new Date();
  const isActive = !resolved && resolutionDate > now;
  const isExpired = !resolved && resolutionDate <= now;

  let statusText = '', statusColor = '', StatusIcon = Clock;
  if (resolved) { statusText = 'Resolved'; statusColor = 'text-emerald-400 bg-emerald-500/10'; StatusIcon = CheckCircle2; }
  else if (isActive) { statusText = 'Active'; statusColor = 'text-violet-400 bg-violet-500/10'; StatusIcon = Clock; }
  else { statusText = 'Expired'; statusColor = 'text-red-400 bg-red-500/10'; StatusIcon = AlertCircle; }

  // Time remaining
  let timeLabel = '';
  if (isActive) {
    const diff = resolutionDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    timeLabel = days > 0 ? `${days}d ${hours}h remaining` : hours > 0 ? `${hours}h ${mins}m remaining` : `${mins}m remaining`;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Back link */}
      <Link
        href="/markets"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Markets
      </Link>

      {/* Market Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}>
            <StatusIcon className="h-3 w-3" />
            {statusText}
          </span>
          <span className="text-xs text-zinc-600">Market #{marketId}</span>
          {isActive && timeLabel && (
            <span className="text-xs text-zinc-500">{timeLabel}</span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">{question}</h1>
        <p className="text-sm text-zinc-500">
          Resolves {resolutionDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {resolutionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-6 mt-8">
        {/* Left column: Market info */}
        <div className="lg:col-span-3 space-y-5">
          {/* Market Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
          >
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Market Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-600 mb-0.5">Status</p>
                <p className="text-sm font-medium text-white capitalize">{statusText}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-600 mb-0.5">Resolution Date</p>
                <p className="text-sm font-medium text-white">{resolutionDate.toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-600 mb-0.5">Privacy</p>
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-violet-400" /> Poseidon + ZK
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-600 mb-0.5">Network</p>
                <p className="text-sm font-medium text-white">Sepolia</p>
              </div>
            </div>

            {resolved && outcome > BigInt(0) && (
              <div className="mt-5 pt-5 border-t border-white/[0.06]">
                <p className="text-xs text-zinc-600 mb-1">Final Outcome</p>
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold ${
                  outcome === BigInt(1)
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {outcome === BigInt(1) ? 'YES' : 'NO'}
                </span>
              </div>
            )}
          </motion.div>

          {/* Pool Statistics */}
          {totalPool > BigInt(0) && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.4 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Coins className="h-4 w-4 text-zinc-400" />
                <h3 className="text-sm font-medium text-zinc-400">Pool Stats</h3>
              </div>

              {/* Pool bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-emerald-400 font-medium">YES {totalPool > BigInt(0) ? Math.round(Number(totalYes * BigInt(100)) / Number(totalPool)) : 50}%</span>
                  <span className="text-red-400 font-medium">{totalPool > BigInt(0) ? Math.round(Number(totalNo * BigInt(100)) / Number(totalPool)) : 50}% NO</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500/60 transition-all duration-500"
                    style={{ width: `${totalPool > BigInt(0) ? Number(totalYes * BigInt(100)) / Number(totalPool) : 50}%` }}
                  />
                  <div
                    className="h-full bg-red-500/60 transition-all duration-500"
                    style={{ width: `${totalPool > BigInt(0) ? Number(totalNo * BigInt(100)) / Number(totalPool) : 50}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-zinc-600 mb-0.5">YES Pool</p>
                  <p className="font-medium text-emerald-400">{(Number(totalYes) / 1e18).toFixed(4)} ETH</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-600 mb-0.5">NO Pool</p>
                  <p className="font-medium text-red-400">{(Number(totalNo) / 1e18).toFixed(4)} ETH</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-600 mb-0.5">Total</p>
                  <p className="font-medium text-white">{(Number(totalPool) / 1e18).toFixed(4)} ETH</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* User's Existing Prediction */}
          {isConnected && userCommitment > BigInt(0) && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className={`rounded-2xl border p-6 ${
                userRevealed
                  ? userDidWin
                    ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                    : 'border-red-500/20 bg-red-500/[0.04]'
                  : 'border-violet-500/20 bg-violet-500/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                {userRevealed ? (
                  userDidWin ? (
                    <><Trophy className="h-4 w-4 text-amber-400" /><h3 className="text-sm font-medium text-emerald-300">You Won!</h3></>
                  ) : (
                    <><XCircle className="h-4 w-4 text-red-400" /><h3 className="text-sm font-medium text-red-300">You Lost</h3></>
                  )
                ) : (
                  <><Shield className="h-4 w-4 text-violet-400" /><h3 className="text-sm font-medium text-violet-300">Your Prediction</h3></>
                )}
              </div>

              {/* Win result banner */}
              {userRevealed && userDidWin && payout && payout > BigInt(0) && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 mb-4 text-center">
                  <p className="text-xs text-emerald-400/70 mb-1">Payout Received</p>
                  <p className="text-2xl font-bold text-emerald-400">{(Number(payout) / 1e18).toFixed(4)} ETH</p>
                  <p className="text-xs text-emerald-400/60 mt-1">Sent to your wallet</p>
                </div>
              )}

              {/* Loss result banner */}
              {userRevealed && userDidLose && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-4 text-center">
                  <p className="text-xs text-red-400/70 mb-1">Result</p>
                  <p className="text-lg font-bold text-red-400">Better luck next time</p>
                  <p className="text-xs text-red-400/60 mt-1">You predicted {predictedLabel}, outcome was {outcomeLabel}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-zinc-600 mb-0.5">You Predicted</p>
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                    (storedBet?.prediction === 1 || (!storedBet && userSide))
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}>
                    {predictedLabel}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-zinc-600 mb-0.5">Staked</p>
                  <p className="font-medium text-white">{(Number(userAmount) / 1e18).toFixed(4)} ETH</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-600 mb-0.5">Status</p>
                  <p className="font-medium text-white">
                    {userClaimed ? 'Claimed' : userRevealed ? 'Revealed' : 'Committed (hidden)'}
                  </p>
                </div>
                {resolved && outcome > BigInt(0) && (
                  <div>
                    <p className="text-xs text-zinc-600 mb-0.5">Outcome</p>
                    <span className={`text-sm font-semibold ${
                      outcome === BigInt(1) ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {outcomeLabel}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Reveal Section */}
          {resolved && isConnected && userCommitment > BigInt(0) && !userRevealed && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
            >
              <h3 className="text-sm font-medium text-zinc-400 mb-4">Reveal & Claim</h3>
              <p className="text-sm text-zinc-500 mb-4">The market has resolved. Reveal your prediction to claim winnings.</p>
              <button
                onClick={handleRevealAndClaim}
                disabled={isRevealing}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
              >
                {isRevealing && <Loader2 className="h-4 w-4 animate-spin" />}
                {isRevealing ? 'Generating Proof...' : 'Reveal & Claim Winnings'}
              </button>
              {revealStatus && (
                <p className="mt-3 text-xs text-center text-amber-400/80 break-all">{revealStatus}</p>
              )}
            </motion.div>
          )}
        </div>

        {/* Right column: Commit form */}
        <div className="lg:col-span-2">
          {isActive && isConnected && userCommitment === BigInt(0) ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="sticky top-24 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
            >
              <h3 className="text-sm font-medium text-white mb-5">Make Your Prediction</h3>

              {/* YES / NO */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={() => setPrediction(1)}
                  className={clsx(
                    'relative rounded-xl py-3.5 text-sm font-semibold transition-all duration-200 border',
                    prediction === 1
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                      : 'bg-white/[0.02] text-zinc-400 border-white/[0.06] hover:bg-emerald-500/[0.06] hover:text-emerald-400 hover:border-emerald-500/20'
                  )}
                >
                  {prediction === 1 && <CheckCircle2 className="absolute top-2 right-2 h-3.5 w-3.5" />}
                  YES
                </button>
                <button
                  onClick={() => setPrediction(0)}
                  className={clsx(
                    'relative rounded-xl py-3.5 text-sm font-semibold transition-all duration-200 border',
                    prediction === 0
                      ? 'bg-red-500/10 text-red-400 border-red-500/30 shadow-lg shadow-red-500/10'
                      : 'bg-white/[0.02] text-zinc-400 border-white/[0.06] hover:bg-red-500/[0.06] hover:text-red-400 hover:border-red-500/20'
                  )}
                >
                  {prediction === 0 && <CheckCircle2 className="absolute top-2 right-2 h-3.5 w-3.5" />}
                  NO
                </button>
              </div>

              {/* Bet amount */}
              <div className="mb-4">
                <label className="block text-xs text-zinc-500 mb-1.5">Stake (ETH)</label>
                <input
                  type="number"
                  placeholder="0.001"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition"
                  min="0.001"
                  step="0.001"
                />
              </div>

              {/* Secret */}
              <div className="mb-5">
                <label className="block text-xs text-zinc-500 mb-1.5">Your Secret</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={secret}
                    readOnly
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs text-zinc-300 font-mono focus:outline-none truncate"
                  />
                  <button
                    onClick={copySecret}
                    className="flex-shrink-0 h-[38px] w-[38px] rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
                  >
                    {copiedSecret ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleCommitPrediction}
                disabled={isPending || prediction === null}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? 'Committing...' : 'Commit Prediction'}
              </button>

              {status && (
                <p className="mt-3 text-xs text-center text-amber-400/80 break-all">{status}</p>
              )}

              <div className="flex items-center gap-2 mt-4 text-xs text-zinc-600">
                <Lock className="h-3 w-3 flex-shrink-0" />
                <p>Your choice is hidden by a Poseidon hash. Save your secret to reveal later.</p>
              </div>
            </motion.div>
          ) : !isConnected ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center"
            >
              <Lock className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400 mb-1">Connect your wallet</p>
              <p className="text-xs text-zinc-600">to make a prediction on this market</p>
            </motion.div>
          ) : userCommitment > BigInt(0) ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6 text-center"
            >
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm text-emerald-300 font-medium mb-1">Prediction Committed</p>
              <p className="text-xs text-zinc-500">Your prediction is securely stored on-chain.</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center"
            >
              <AlertCircle className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400 mb-1">Market {isExpired ? 'Expired' : 'Resolved'}</p>
              <p className="text-xs text-zinc-600">Predictions are no longer accepted.</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}