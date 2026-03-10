// ─── Universal Deployment Script ──────────────────────────────
// Usage:
//   npx hardhat run scripts/deploy.js --network <name>
//
// Features:
//   • Works on ANY configured network without code changes
//   • Mainnet safety prompt (unless SKIP_MAINNET_CONFIRMATION=true)
//   • Saves deployment addresses to deployments/<network>.json
//   • Verifies contracts on block explorers (when API keys present)
//   • Network-aware gas estimation
// ─────────────────────────────────────────────────────────────
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ─── Constants ──────────────────────────────────────────────
const MAINNET_CHAIN_IDS = new Set([1, 137, 42161, 10, 8453, 324]);
const DEPLOYMENTS_DIR = path.join(__dirname, "..", "deployments");

// ─── Helpers ────────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a); }));
}

async function getNetworkInfo() {
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  return { network, chainId: Number(chainId), deployer, balance };
}

async function estimateGas() {
  const feeData = await hre.ethers.provider.getFeeData();
  return {
    gasPrice: feeData.gasPrice ? hre.ethers.formatUnits(feeData.gasPrice, "gwei") + " gwei" : "N/A",
    maxFeePerGas: feeData.maxFeePerGas ? hre.ethers.formatUnits(feeData.maxFeePerGas, "gwei") + " gwei" : "N/A",
  };
}

function saveDeployment(network, data) {
  ensureDir(DEPLOYMENTS_DIR);
  const filePath = path.join(DEPLOYMENTS_DIR, `${network}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`  📄 Deployment saved to ${filePath}`);

  // Also write to frontend/public/deployments/ for runtime loading
  const frontendDir = path.join(__dirname, "..", "..", "frontend", "public", "deployments");
  ensureDir(frontendDir);
  // Save wagmi-compatible format
  const frontendData = {
    market: data.market,
    settlementVerifier: data.settlementVerifier,
  };
  const frontendPath = path.join(frontendDir, `${network}.json`);
  fs.writeFileSync(frontendPath, JSON.stringify(frontendData, null, 2));
  console.log(`  📄 Frontend deployment saved to ${frontendPath}`);
}

function saveDeploymentLog(network, data) {
  ensureDir(DEPLOYMENTS_DIR);
  const logFile = path.join(DEPLOYMENTS_DIR, `${network}.log`);
  const entry = [
    `\n${"=".repeat(60)}`,
    `Deployment: ${new Date().toISOString()}`,
    `Network: ${network} (chainId: ${data.chainId})`,
    `Deployer: ${data.deployer}`,
    `SettlementVerifier: ${data.settlementVerifier}`,
    `zkPredictionMarket: ${data.market}`,
    `Tx Hash (verifier): ${data.verifierTxHash}`,
    `Tx Hash (market): ${data.marketTxHash}`,
    `${"=".repeat(60)}`,
  ].join("\n");
  fs.appendFileSync(logFile, entry + "\n");
}

async function verifyContract(address, constructorArgs) {
  // Skip for local networks
  const { chainId } = await hre.ethers.provider.getNetwork();
  if ([31337, 1337].includes(Number(chainId))) return;

  try {
    console.log(`  🔍 Verifying ${address}...`);
    await hre.run("verify:verify", {
      address,
      constructorArguments: constructorArgs,
    });
    console.log(`  ✅ Verified ${address}`);
  } catch (err) {
    if (err.message.includes("Already Verified") || err.message.includes("already verified")) {
      console.log(`  ✅ Already verified: ${address}`);
    } else {
      console.warn(`  ⚠️  Verification failed: ${err.message}`);
    }
  }
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  const info = await getNetworkInfo();
  const gas = await estimateGas();

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║          zkPredict — Deployment              ║");
  console.log("╚══════════════════════════════════════════════╝\n");
  console.log(`  Network:   ${info.network} (chainId: ${info.chainId})`);
  console.log(`  Deployer:  ${info.deployer.address}`);
  console.log(`  Balance:   ${hre.ethers.formatEther(info.balance)} ETH`);
  console.log(`  Gas Price: ${gas.gasPrice}`);
  console.log(`  Max Fee:   ${gas.maxFeePerGas}\n`);

  // ── Mainnet safety check ──
  if (MAINNET_CHAIN_IDS.has(info.chainId)) {
    console.log("  ⚠️  WARNING: You are deploying to a MAINNET!\n");
    if (process.env.SKIP_MAINNET_CONFIRMATION !== "true") {
      const answer = await ask('  Type "DEPLOY" to confirm mainnet deployment: ');
      if (answer.trim() !== "DEPLOY") {
        console.log("\n  ❌ Deployment cancelled.\n");
        process.exit(0);
      }
    }
  }

  // ── Deploy SettlementVerifier ──
  console.log("\n  [1/2] Deploying SettlementVerifier...");
  const Verifier = await hre.ethers.getContractFactory("SettlementVerifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  const verifierTxHash = verifier.deploymentTransaction()?.hash || "N/A";
  console.log(`    → ${verifierAddress}  (tx: ${verifierTxHash})`);

  // ── Deploy zkPredictionMarket ──
  console.log("\n  [2/2] Deploying zkPredictionMarket...");
  const Market = await hre.ethers.getContractFactory("zkPredictionMarket");
  const market = await Market.deploy(verifierAddress);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  const marketTxHash = market.deploymentTransaction()?.hash || "N/A";
  console.log(`    → ${marketAddress}  (tx: ${marketTxHash})`);

  // ── Create test market on non-mainnet ──
  if (!MAINNET_CHAIN_IDS.has(info.chainId)) {
    console.log("\n  📝 Creating test market...");
    const resolutionTime = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    const tx = await market.createMarket(
      "Will ETH be above $3000 by end of month?",
      resolutionTime,
    );
    await tx.wait();
    console.log("    → Test market #1 created");
  }

  // ── Save deployment data ──
  const deploymentData = {
    network: info.network,
    chainId: info.chainId,
    deployer: info.deployer.address,
    settlementVerifier: verifierAddress,
    market: marketAddress,
    verifierTxHash,
    marketTxHash,
    timestamp: new Date().toISOString(),
  };

  saveDeployment(info.network, deploymentData);
  saveDeploymentLog(info.network, deploymentData);

  // ── Verify contracts ──
  console.log("\n  🔎 Contract verification...");
  await verifyContract(verifierAddress, []);
  await verifyContract(marketAddress, [verifierAddress]);

  // ── Summary ──
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║          ✅ Deployment Complete              ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  Verifier:  ${verifierAddress}  ║`);
  console.log(`║  Market:    ${marketAddress}  ║`);
  console.log("╚══════════════════════════════════════════════╝\n");

  // Hint for frontend env
  console.log("  💡 Add to frontend/.env.local:");
  const prefix = info.network.toUpperCase().replace(/-/g, "_");
  console.log(`     NEXT_PUBLIC_${prefix}_VERIFIER_ADDRESS=${verifierAddress}`);
  console.log(`     NEXT_PUBLIC_${prefix}_MARKET_ADDRESS=${marketAddress}`);
  console.log();
}

main().catch((error) => {
  console.error("\n  ❌ Deployment failed:", error.message || error);
  process.exitCode = 1;
});
