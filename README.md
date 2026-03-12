# zkPredict — Zero-Knowledge Prediction Market

A decentralized prediction market that uses **Zero-Knowledge Proofs** (ZK-SNARKs) to keep user predictions private until market resolution. Built with Circom, Solidity, and Next.js.

## How It Works

Traditional prediction markets reveal your bet publicly the moment you place it. zkPredict uses a **commit-reveal scheme powered by ZK proofs** to keep your prediction hidden:

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────────┐
│  1. COMMIT   │ ──▶ │  2. RESOLVE   │ ──▶ │  3. PROVE    │ ──▶ │  4. CLAIM      │
│              │     │              │     │              │     │                │
│ Hash your    │     │ Owner sets   │     │ Generate a   │     │ Submit proof   │
│ prediction   │     │ the outcome  │     │ ZK proof of  │     │ on-chain to    │
│ + secret     │     │ (YES / NO)   │     │ your bet     │     │ claim winnings │
└─────────────┘     └──────────────┘     └──────────────┘     └────────────────┘
```

1. **Commit Phase** — You pick YES or NO, choose a secret, and submit a Poseidon hash commitment on-chain along with your ETH bet. Nobody can see your prediction.
2. **Resolution** — After the deadline, the market owner resolves the market with the actual outcome.
3. **Prove** — Your browser generates a Groth16 ZK-SNARK proof that your committed prediction matches the outcome — without revealing the secret.
4. **Claim** — The smart contract verifies the proof on-chain and pays out your winnings proportionally from the losing pool.

## Architecture

```
zkPredict/
├── circuits/          # Circom ZK circuits
│   ├── settlement.circom   # Main circuit: proves prediction matches outcome
│   ├── commitment.circom   # Commitment hash circuit
│   └── build/              # Compiled circuit artifacts (wasm, zkey, r1cs)
│
├── contracts/         # Solidity smart contracts (Hardhat)
│   ├── contracts/
│   │   ├── zkPredictionMarket.sol   # Main market contract
│   │   └── SettlementVerifier.sol   # Auto-generated Groth16 verifier
│   ├── scripts/       # Deploy & utility scripts
│   └── test/          # Contract test suite
│
├── frontend/          # Next.js 16 web application
│   ├── app/           # App router pages
│   │   ├── markets/   # Browse & view markets
│   │   ├── bets/      # Your bets & reveals
│   │   ├── activity/  # Market activity feed
│   │   └── admin/     # Owner-only market resolution panel
│   ├── lib/
│   │   ├── abis/      # Contract ABIs
│   │   ├── contracts/ # Address resolution
│   │   ├── hooks/     # Custom React hooks
│   │   └── networks/  # Multi-chain registry & address resolver
│   └── public/
│       └── circuits/  # settlement.wasm + settlement_final.zkey (browser proving)
│
└── docs/              # Documentation
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| ZK Circuits | [Circom 2.0](https://docs.circom.io/) + [snarkjs](https://github.com/iden3/snarkjs) (Groth16) |
| Hash Function | Poseidon (ZK-friendly, via circomlib) |
| Smart Contracts | Solidity 0.8.19 + [Hardhat](https://hardhat.org/) |
| Frontend | [Next.js 16](https://nextjs.org/) + React 19 + TypeScript |
| Wallet | [RainbowKit](https://www.rainbowkit.com/) + [wagmi](https://wagmi.sh/) + [viem](https://viem.sh/) |
| Styling | Tailwind CSS v4 + Framer Motion |
| Supported Chains | Hardhat, Sepolia, Goerli, Mumbai, Ethereum, Polygon, Arbitrum, Optimism, Base, zkSync |

## ZK Circuit: Settlement

The core circuit ([`circuits/settlement.circom`](circuits/settlement.circom)) takes:

**Public inputs:** `commitment`, `marketOutcome`, `marketId`
**Private inputs:** `prediction`, `secret`
**Output:** `isWinner` (0 or 1)

It proves:
1. `Poseidon(Poseidon(prediction, secret), marketId) == commitment` — the user's prediction matches their on-chain commitment
2. `prediction == marketOutcome` → `isWinner = 1`

The proof is verified on-chain by `SettlementVerifier.sol` (auto-generated from the circuit's trusted setup).

## Prerequisites

- **Node.js** >= 18
- **Rust** (for circom compiler) — install via [rustup](https://rustup.rs/)
- **Circom 2** — built from source via the included `circom/` directory

## Quick Start

### 1. Install Dependencies

```bash
# Root
npm install

# Contracts
cd contracts && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment Variables

```bash
# Contracts — copy and fill in values
cp contracts/.env.example contracts/.env

# Frontend — copy and fill in values
cp frontend/.env.example frontend/.env.local
```

**Minimum required for local development:**

```env
# frontend/.env.local
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_DEFAULT_CHAIN=hardhat
NEXT_PUBLIC_HARDHAT_MARKET_ADDRESS=   # Set after deployment
NEXT_PUBLIC_HARDHAT_VERIFIER_ADDRESS= # Set after deployment
```

Get a free WalletConnect Project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com).

### 3. Compile Circuits (one-time)

```bash
cd circuits
npm install
bash compile.sh
```

This generates `settlement.wasm`, `settlement.r1cs`, and performs the trusted setup to produce `settlement_final.zkey`. The WASM and zkey files are copied to `frontend/public/circuits/` for browser-side proof generation.

### 4. Start Local Blockchain

```bash
cd contracts
npx hardhat node
```

### 5. Deploy Contracts

In a new terminal:

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

Note the printed addresses and set them in `frontend/.env.local`:

```env
NEXT_PUBLIC_HARDHAT_MARKET_ADDRESS=0x...
NEXT_PUBLIC_HARDHAT_VERIFIER_ADDRESS=0x...
```

### 6. Start Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect your wallet (MetaMask pointed at `localhost:8545`), and start predicting!

## Deploying to Testnets / Mainnets

### Setup

1. Fill in your deployer private key and RPC URLs in `contracts/.env`:

```env
DEPLOYER_PRIVATE_KEY=your_private_key_without_0x
ALCHEMY_API_KEY=your_alchemy_key
ETHERSCAN_API_KEY=your_etherscan_key
```

2. Deploy using the universal deploy script:

```bash
# Sepolia testnet
cd contracts
npm run deploy:sepolia

# Or any supported network
npm run deploy:polygon
npm run deploy:arbitrum
npm run deploy:base
```

3. Update the frontend env vars with the deployed addresses for that network:

```env
NEXT_PUBLIC_DEFAULT_CHAIN=sepolia
NEXT_PUBLIC_SEPOLIA_MARKET_ADDRESS=0x...
NEXT_PUBLIC_SEPOLIA_VERIFIER_ADDRESS=0x...
```

### Available Deploy Targets

```
npm run deploy:local          # Hardhat localhost
npm run deploy:sepolia        # Sepolia testnet
npm run deploy:goerli         # Goerli testnet
npm run deploy:mumbai         # Polygon Mumbai
npm run deploy:ethereum       # Ethereum mainnet
npm run deploy:polygon        # Polygon mainnet
npm run deploy:arbitrum       # Arbitrum One
npm run deploy:optimism       # Optimism mainnet
npm run deploy:base           # Base mainnet
npm run deploy:zksync         # zkSync Era
```

## Smart Contract

### Key Functions

| Function | Description |
|----------|------------|
| `createMarket(question, resolutionTime)` | Create a new prediction market |
| `commitPrediction(marketId, commitment, side)` | Place a bet with a hash commitment (payable) |
| `resolveMarket(marketId, outcome)` | Owner resolves the market (1=YES, 2=NO) |
| `revealAndClaim(marketId, pA, pB, pC, pubSignals)` | Submit ZK proof to reveal & claim winnings |
| `calculatePayout(marketId, user)` | View expected payout |
| `getMarket(marketId)` | Get market details |
| `getMarketStats(marketId)` | Get pool sizes and implied odds |

### Public Signal Ordering

The Groth16 proof's public signals follow circom's convention — **outputs first**, then public inputs in declaration order:

| Index | Signal | Description |
|-------|--------|-------------|
| 0 | `isWinner` | Circuit output (0 or 1) |
| 1 | `commitment` | Poseidon hash commitment |
| 2 | `marketOutcome` | Resolved outcome (1=YES, 2=NO) |
| 3 | `marketId` | Market identifier |

## Testing

```bash
cd contracts

# Run the full test suite
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# End-to-end flow test (requires running Hardhat node)
node test-full-flow.js
```

## Frontend Pages

| Route | Description |
|-------|------------|
| `/` | Landing page with market overview |
| `/markets` | Browse all markets, create new ones |
| `/markets/[id]` | Market detail: place bets, view pool stats, reveal & claim |
| `/bets` | Your betting history |
| `/activity` | Recent market activity |
| `/admin` | Owner-only panel to resolve markets |

## Environment Variables Reference

### Contracts (`contracts/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DEPLOYER_PRIVATE_KEY` | For deployment | Private key of the deploying wallet |
| `ALCHEMY_API_KEY` | For testnets/mainnets | Alchemy API key |
| `INFURA_API_KEY` | Optional | Infura API key (alternative RPC) |
| `HARDHAT_RPC_URL` | No | Local Hardhat node URL (default: `http://127.0.0.1:8545`) |
| `ETHERSCAN_API_KEY` | For verification | Etherscan API key |
| `MARKET_CONTRACT_ADDRESS` | For scripts | Deployed market contract address |
| `VERIFIER_CONTRACT_ADDRESS` | For scripts | Deployed verifier contract address |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | **Yes** | WalletConnect project ID |
| `NEXT_PUBLIC_DEFAULT_CHAIN` | No | Default network slug (default: `hardhat`) |
| `NEXT_PUBLIC_DEFAULT_CHAIN_ID` | No | Default chain ID (default: `31337`) |
| `NEXT_PUBLIC_HARDHAT_MARKET_ADDRESS` | For local | Market contract on Hardhat |
| `NEXT_PUBLIC_HARDHAT_VERIFIER_ADDRESS` | For local | Verifier contract on Hardhat |
| `NEXT_PUBLIC_{NETWORK}_MARKET_ADDRESS` | Per chain | Market contract address |
| `NEXT_PUBLIC_{NETWORK}_VERIFIER_ADDRESS` | Per chain | Verifier contract address |

## Security Considerations

- **Secrets are stored in browser `localStorage`** — clearing browser data means you cannot reveal your prediction. Export secrets before clearing.
- **Market resolution is centralized** — the contract owner decides outcomes. In production, consider integrating an oracle (Chainlink, UMA) for decentralized resolution.
- **The trusted setup** uses a Powers of Tau ceremony (`powersOfTau28_hez_final_12.ptau`). For production, run a multi-party ceremony.
- **Frontend proof generation** — ZK proofs are generated entirely in the browser using WASM. No secrets ever leave the user's device.

## License

MIT
