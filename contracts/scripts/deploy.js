const hre = require("hardhat");

async function main() {
  console.log("Deploying zkPredictionMarket...");

  // Deploy settlement verifier first
  const Verifier = await hre.ethers.getContractFactory("SettlementVerifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  
  console.log("SettlementVerifier deployed to:", verifierAddress);

  // Deploy main contract with settlement verifier address
  const Market = await hre.ethers.getContractFactory("zkPredictionMarket");
  const market = await Market.deploy(verifierAddress);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  
  console.log("zkPredictionMarket deployed to:", marketAddress);
  
  // Create test markets using block timestamp (safe even if chain time was fast-forwarded)
  const block = await hre.ethers.provider.getBlock("latest");
  const resolutionTime = Number(block.timestamp) + 7 * 24 * 60 * 60; // 1 week from block time

  const tx1 = await market.createMarket(
    "Will ETH be above $3000 by end of month?",
    resolutionTime
  );
  await tx1.wait();
  console.log("Test market #1 created");

  const tx2 = await market.createMarket(
    "Will BTC reach $100k this year?",
    resolutionTime
  );
  await tx2.wait();
  console.log("Test market #2 created");

  const tx3 = await market.createMarket(
    "Will Solana flip Ethereum in TVL?",
    resolutionTime
  );
  await tx3.wait();
  console.log("Test market #3 created");
  
  console.log("\n✅ Deployment Complete!");
  console.log("========================");
  console.log("Verifier:", verifierAddress);
  console.log("Market:  ", marketAddress);
  console.log("\nAdd to frontend/.env.local:");
  console.log(`NEXT_PUBLIC_HARDHAT_MARKET_ADDRESS=${marketAddress}`);
  console.log(`NEXT_PUBLIC_HARDHAT_VERIFIER_ADDRESS=${verifierAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});