const { ethers } = require('ethers');
const snarkjs = require('snarkjs');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545');
  const marketAddr = process.env.MARKET_CONTRACT_ADDRESS;
  const verifierAddr = process.env.VERIFIER_CONTRACT_ADDRESS;
  if (!marketAddr || !verifierAddr) {
    console.error('Set MARKET_CONTRACT_ADDRESS and VERIFIER_CONTRACT_ADDRESS in .env');
    process.exit(1);
  }
  const abi = require('./artifacts/contracts/zkPredictionMarket.sol/zkPredictionMarket.json').abi;
  const verifierAbi = require('./artifacts/contracts/SettlementVerifier.sol/SettlementVerifier.json').abi;

  const market = new ethers.Contract(marketAddr, abi, provider);
  const verifier = new ethers.Contract(verifierAddr, verifierAbi, provider);

  // Get all signers
  const signers = await provider.listAccounts();
  const userAddr = signers[0].address;
  console.log('User address:', userAddr);

  // Get market info
  const m = await market.getMarket(1);
  console.log('\n--- Market #1 ---');
  console.log('Question:', m[0]);
  console.log('Outcome:', m[2].toString(), '(1=YES, 2=NO)');
  console.log('Resolved:', m[3]);

  // Get user prediction
  const pred = await market.getUserPrediction(1, userAddr);
  console.log('\n--- User Prediction ---');
  console.log('Commitment:', pred[0].toString());
  console.log('Amount:', ethers.formatEther(pred[1]), 'ETH');
  console.log('Side (true=YES):', pred[2]);
  console.log('Revealed:', pred[3]);
  console.log('Claimed:', pred[4]);

  if (pred[0].toString() === '0') {
    console.log('\nNo prediction found for this user.');
    return;
  }

  // Now try to generate a proof
  // We need the user's secret from localStorage - we don't have it here,
  // so let's just test with a known prediction/secret and see if proof generation works
  const wasmPath = path.join(__dirname, '..', 'frontend', 'public', 'circuits', 'settlement.wasm');
  const zkeyPath = path.join(__dirname, '..', 'frontend', 'public', 'circuits', 'settlement_final.zkey');

  console.log('\n--- Files ---');
  console.log('WASM exists:', fs.existsSync(wasmPath), '- size:', fs.existsSync(wasmPath) ? fs.statSync(wasmPath).size : 0);
  console.log('ZKEY exists:', fs.existsSync(zkeyPath), '- size:', fs.existsSync(zkeyPath) ? fs.statSync(zkeyPath).size : 0);

  // Check if the zkey matches the verifier
  // Extract the verification key from the zkey
  const vkey = await snarkjs.zKey.exportVerificationKey(zkeyPath);
  console.log('\n--- Verification Key ---');
  console.log('Protocol:', vkey.protocol);
  console.log('nPublic:', vkey.nPublic);
  console.log('Curve:', vkey.curve);

  // Test proof generation with dummy inputs to see if it at least runs
  // The commitment check will constrain the inputs
  console.log('\n--- Testing proof generation with known values ---');

  // Use a known test: prediction=1, secret=12345, marketId=1
  // Compute commitment using poseidon
  const { buildPoseidon } = require('circomlibjs');
  const poseidon = await buildPoseidon();
  
  const prediction = 1;
  const secretNum = BigInt(12345);
  const marketId = 1;
  
  const hash1 = poseidon([BigInt(prediction), secretNum]);
  const hash2 = poseidon([poseidon.F.toObject(hash1), BigInt(marketId)]);
  const commitment = poseidon.F.toObject(hash2);
  
  console.log('Test commitment:', commitment.toString());

  const circuitInputs = {
    commitment: commitment.toString(),
    marketOutcome: m[2].toString(),
    marketId: marketId.toString(),
    prediction: prediction.toString(),
    secret: secretNum.toString(),
  };
  console.log('Circuit inputs:', circuitInputs);

  try {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInputs,
      wasmPath,
      zkeyPath
    );
    console.log('\nProof generated successfully!');
    console.log('Public signals:', publicSignals);
    console.log('Signal meanings: [commitment, marketOutcome, marketId, isWinner]');

    // Verify locally
    const valid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    console.log('Local verification:', valid ? 'VALID' : 'INVALID');

    // Now try on-chain verification
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    const calldataArgs = JSON.parse('[' + calldata + ']');
    const [pA, pB, pC, pubSignals] = calldataArgs;

    console.log('\n--- On-chain verification test ---');
    console.log('pA:', pA);
    console.log('pubSignals:', pubSignals);

    try {
      const onChainResult = await verifier.verifyProof(pA, pB, pC, pubSignals);
      console.log('On-chain verifier result:', onChainResult);
    } catch (e) {
      console.log('On-chain verifier REVERTED:', e.message.slice(0, 200));
    }

  } catch (e) {
    console.log('Proof generation FAILED:', e.message.slice(0, 300));
  }
}

main().catch(console.error);
