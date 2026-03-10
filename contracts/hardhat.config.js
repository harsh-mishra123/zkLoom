require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// ─── Helpers ────────────────────────────────────────────────
const accounts =
  process.env.DEPLOYER_PRIVATE_KEY ? [`0x${process.env.DEPLOYER_PRIVATE_KEY.replace(/^0x/, "")}`] : [];

const alchemy = (slug) =>
  process.env.ALCHEMY_API_KEY
    ? `https://${slug}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : undefined;

const infura = (slug) =>
  process.env.INFURA_API_KEY
    ? `https://${slug}.infura.io/v3/${process.env.INFURA_API_KEY}`
    : undefined;

/** Return { url, accounts } only when a valid RPC url exists. */
function optionalNetwork(envUrl, fallbackUrl) {
  const url = process.env[envUrl] || fallbackUrl;
  if (!url || accounts.length === 0) return undefined;
  return { url, accounts };
}

// ─── Gas settings ───────────────────────────────────────────
const gasMultiplier = parseFloat(process.env.GAS_MULTIPLIER || "1.2");
const gasPriceGwei = process.env.GAS_PRICE_GWEI
  ? parseInt(process.env.GAS_PRICE_GWEI) * 1e9
  : undefined;

// ─── Build network map (only include configured networks) ───
const networks = {
  // Always available
  hardhat: { chainId: 31337 },
  localhost: { url: process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545" },
};

// Local
const ganache = optionalNetwork("GANACHE_RPC_URL", "http://127.0.0.1:7545");
if (ganache) networks.ganache = { ...ganache, chainId: 1337 };

// Testnets
const testnetDefs = [
  ["sepolia",         "SEPOLIA_RPC_URL",          alchemy("eth-sepolia"),       11155111, 2],
  ["goerli",          "GOERLI_RPC_URL",           alchemy("eth-goerli"),        5,        2],
  ["mumbai",          "MUMBAI_RPC_URL",           alchemy("polygon-mumbai"),    80001,    5],
  ["arbitrumGoerli",  "ARBITRUM_GOERLI_RPC_URL",  alchemy("arb-goerli"),        421613,   2],
  ["optimismGoerli",  "OPTIMISM_GOERLI_RPC_URL",  alchemy("opt-goerli"),        420,      2],
];

for (const [name, envKey, fallback, chainId, confirmations] of testnetDefs) {
  const cfg = optionalNetwork(envKey, fallback);
  if (cfg) networks[name] = { ...cfg, chainId, gasMultiplier, confirmations };
}

// Mainnets (higher confirmations, explicit gas price if set)
const mainnetDefs = [
  ["ethereum",  "ETHEREUM_RPC_URL",  alchemy("eth-mainnet"),     1,      5],
  ["polygon",   "POLYGON_RPC_URL",   alchemy("polygon-mainnet"), 137,    10],
  ["arbitrum",  "ARBITRUM_RPC_URL",  alchemy("arb-mainnet"),     42161,  5],
  ["optimism",  "OPTIMISM_RPC_URL",  alchemy("opt-mainnet"),     10,     5],
  ["base",      "BASE_RPC_URL",      alchemy("base-mainnet"),    8453,   5],
  ["zksync",    "ZKSYNC_RPC_URL",    "https://mainnet.era.zksync.io", 324, 5],
];

for (const [name, envKey, fallback, chainId, confirmations] of mainnetDefs) {
  const cfg = optionalNetwork(envKey, fallback);
  if (cfg) {
    networks[name] = {
      ...cfg,
      chainId,
      gasMultiplier,
      confirmations,
      ...(gasPriceGwei ? { gasPrice: gasPriceGwei } : {}),
    };
  }
}

// ─── Etherscan / block explorer verification ────────────────
const etherscan = { apiKey: {} };

const explorerKeys = {
  mainnet:        process.env.ETHERSCAN_API_KEY,
  sepolia:        process.env.ETHERSCAN_API_KEY,
  goerli:         process.env.ETHERSCAN_API_KEY,
  polygon:        process.env.POLYGONSCAN_API_KEY,
  polygonMumbai:  process.env.POLYGONSCAN_API_KEY,
  arbitrumOne:    process.env.ARBISCAN_API_KEY,
  arbitrumGoerli: process.env.ARBISCAN_API_KEY,
  optimisticEthereum:       process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
  optimisticGoerli:         process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
  base:           process.env.BASESCAN_API_KEY,
};

for (const [net, key] of Object.entries(explorerKeys)) {
  if (key) etherscan.apiKey[net] = key;
}

// ─── Export ─────────────────────────────────────────────────
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,
    },
  },
  networks,
  etherscan,
  gasReporter: {
    enabled: !!process.env.REPORT_GAS,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};