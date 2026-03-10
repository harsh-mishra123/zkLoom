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
  const market = new ethers.Contract(marketAddr, 
    require('./artifacts/contracts/zkPredictionMarket.sol/zkPredictionMarket.json').abi, signer);
  const block = await provider.getBlock('latest');
  const blockTime = Number(block.timestamp);
  const resTime = blockTime + 86400;
  console.log('Block time:', new Date(blockTime*1000).toISOString());
  console.log('Resolution:', new Date(resTime*1000).toISOString());
  
  const tx = await market.createMarket('Will ETH be above $3000 by end of month?', resTime);
  await tx.wait();
  console.log('Market #2 created successfully');
  
  const tx2 = await market.createMarket('Will BTC reach $100k this year?', resTime);
  await tx2.wait();
  console.log('Market #3 created successfully');
}
main().catch(console.error);
