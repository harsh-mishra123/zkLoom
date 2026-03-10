const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545');
  const signer = await provider.getSigner(0);
  
  const marketAddr = process.env.MARKET_CONTRACT_ADDRESS;
  if (!marketAddr) {
    console.error('Set MARKET_CONTRACT_ADDRESS in .env');
    process.exit(1);
  }
  const abi = require('./artifacts/contracts/zkPredictionMarket.sol/zkPredictionMarket.json').abi;
  const market = new ethers.Contract(marketAddr, abi, signer);

  // Get current block time
  const block = await provider.getBlock('latest');
  const blockTime = Number(block.timestamp);
  console.log('Current block time:', blockTime, new Date(blockTime * 1000).toISOString());

  // Create market with resolution 10 minutes from block time
  const resolutionTime = blockTime + 600;
  console.log('Resolution time:', resolutionTime, new Date(resolutionTime * 1000).toISOString());
  const tx = await market.createMarket(
    'Will ETH be above $3000 by end of month?',
    resolutionTime
  );
  await tx.wait();
  console.log('Market #1 created, resolves at:', new Date(resolutionTime * 1000).toISOString());

  // Commit a YES prediction with 0.001 ETH
  // First compute the commitment the same way the frontend does
  const { buildPoseidon } = require('circomlibjs');
  const poseidon = await buildPoseidon();

  const prediction = 1; // YES
  const secretStr = 'testsecret123456';
  const secretBytes = new TextEncoder().encode(secretStr);
  let secretNum = BigInt(0);
  for (let i = 0; i < secretBytes.length; i++) {
    secretNum = (secretNum * BigInt(256) + BigInt(secretBytes[i])) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  }

  const hash1 = poseidon([BigInt(prediction), secretNum]);
  const hash2 = poseidon([poseidon.F.toObject(hash1), BigInt(1)]); // marketId=1
  const commitment = poseidon.F.toObject(hash2);

  console.log('Commitment:', commitment.toString());
  console.log('Secret (for reveal):', secretStr);
  console.log('Secret as number:', secretNum.toString());

  const commitTx = await market.commitPrediction(
    1, // marketId
    commitment,
    true, // side = YES
    { value: ethers.parseEther('0.001') }
  );
  await commitTx.wait();
  console.log('Committed YES prediction with 0.001 ETH');

  // Fast-forward past resolution time
  await provider.send('evm_increaseTime', [700]); // 11+ minutes
  await provider.send('evm_mine', []);
  console.log('Time fast-forwarded past resolution');

  // Resolve market as YES
  const resolveTx = await market.resolveMarket(1, 1); // outcome = YES
  await resolveTx.wait();
  console.log('Market resolved as YES');

  // Now test revealAndClaim with ZK proof
  const snarkjs = require('snarkjs');
  const path = require('path');

  const wasmPath = path.join(__dirname, '..', 'frontend', 'public', 'circuits', 'settlement.wasm');
  const zkeyPath = path.join(__dirname, '..', 'frontend', 'public', 'circuits', 'settlement_final.zkey');

  const circuitInputs = {
    commitment: commitment.toString(),
    marketOutcome: '1', // YES
    marketId: '1',
    prediction: prediction.toString(),
    secret: secretNum.toString(),
  };

  console.log('\nGenerating ZK proof...');
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(circuitInputs, wasmPath, zkeyPath);
  console.log('Public signals:', publicSignals);
  console.log('[isWinner, commitment, marketOutcome, marketId]');

  const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  const calldataArgs = JSON.parse('[' + calldata + ']');
  const [pA, pB, pC, pubSignals] = calldataArgs;

  console.log('\nCalling revealAndClaim...');
  const balanceBefore = await provider.getBalance(signer.address);

  const revealTx = await market.revealAndClaim(1, pA, pB, pC, pubSignals);
  const receipt = await revealTx.wait();

  const balanceAfter = await provider.getBalance(signer.address);
  const gasCost = receipt.gasUsed * receipt.gasPrice;
  const netGain = balanceAfter - balanceBefore + gasCost;

  console.log('revealAndClaim SUCCESS!');
  console.log('Gas used:', receipt.gasUsed.toString());
  console.log('Payout received:', ethers.formatEther(netGain), 'ETH');

  // Check final state
  const pred = await market.getUserPrediction(1, signer.address);
  console.log('\nFinal state - Revealed:', pred[3], 'Claimed:', pred[4]);
}

main().catch(e => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
