// Sources flattened with hardhat v2.28.6 https://hardhat.org

// SPDX-License-Identifier: MIT

// File contracts/zkPredictionMarket.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.19;

interface ISettlementVerifier {
    function verifyProof(
        uint[2] calldata pA,
        uint[2][2] calldata pB,
        uint[2] calldata pC,
        uint[4] calldata pubSignals
    ) external view returns (bool);
}

contract zkPredictionMarket {
    // ---------- Structs ----------
    
    struct Market {
        string question;           // Market question
        uint256 resolutionTime;     // Timestamp when market resolves
        uint256 createdAt;          // When market was created
        uint256 outcome;            // 0 = unresolved, 1 = YES, 2 = NO
        uint256 totalYes;           // Total ETH bet on YES
        uint256 totalNo;            // Total ETH bet on NO
        uint256 totalPool;          // Total ETH in market
        bool resolved;              // Is market resolved?
    }
    
    struct Prediction {
        uint256 commitment;         // Hash of (prediction, secret)
        uint256 amount;             // Amount bet
        bool side;                   // true = YES, false = NO
        bool revealed;              // Has user revealed?
        bool claimed;               // Has user claimed winnings?
    }
    
    // ---------- State Variables ----------
    
    address public owner;
    uint256 public marketCount;
    ISettlementVerifier public settlementVerifier;
    
    // Market ID => Market
    mapping(uint256 => Market) public markets;
    
    // Market ID => User => Prediction
    mapping(uint256 => mapping(address => Prediction)) public predictions;
    
    // ---------- Events ----------
    
    event MarketCreated(uint256 indexed marketId, string question, uint256 resolutionTime);
    event PredictionCommitted(uint256 indexed marketId, address indexed user, uint256 commitment, uint256 amount, bool side);
    event PredictionRevealed(uint256 indexed marketId, address indexed user, bool isWinner, uint256 payout);
    event MarketResolved(uint256 indexed marketId, uint256 outcome);
    
    // ---------- Constructor ----------
    
    constructor(address _settlementVerifier) {
        owner = msg.sender;
        settlementVerifier = ISettlementVerifier(_settlementVerifier);
    }
    
    // ---------- Market Functions ----------
    
    function createMarket(
        string memory _question,
        uint256 _resolutionTime
    ) external returns (uint256) {
        require(_resolutionTime > block.timestamp, "Resolution time must be in future");
        
        marketCount++;
        
        Market storage market = markets[marketCount];
        market.question = _question;
        market.resolutionTime = _resolutionTime;
        market.createdAt = block.timestamp;
        market.outcome = 0;
        market.totalYes = 0;
        market.totalNo = 0;
        market.totalPool = 0;
        market.resolved = false;
        
        emit MarketCreated(marketCount, _question, _resolutionTime);
        
        return marketCount;
    }
    
    // ---------- Commit Functions ----------
    
    function commitPrediction(
        uint256 _marketId,
        uint256 _commitment,
        bool _side  // true = YES, false = NO
    ) external payable {
        Market storage market = markets[_marketId];
        require(market.resolutionTime > block.timestamp, "Market already ended");
        require(msg.value > 0, "Must bet some amount");
        require(!market.resolved, "Market already resolved");
        
        Prediction storage pred = predictions[_marketId][msg.sender];
        require(pred.commitment == 0, "Already committed");
        
        // Update market pools
        if (_side) {
            market.totalYes += msg.value;
        } else {
            market.totalNo += msg.value;
        }
        market.totalPool += msg.value;
        
        // Store prediction
        pred.commitment = _commitment;
        pred.amount = msg.value;
        pred.side = _side;
        pred.revealed = false;
        pred.claimed = false;
        
        emit PredictionCommitted(_marketId, msg.sender, _commitment, msg.value, _side);
    }
    
    // ---------- Resolution Functions ----------
    
    function resolveMarket(uint256 _marketId, uint256 _outcome) external {
        require(msg.sender == owner, "Only owner can resolve");
        require(_outcome == 1 || _outcome == 2, "Outcome must be 1 (YES) or 2 (NO)");
        
        Market storage market = markets[_marketId];
        require(block.timestamp >= market.resolutionTime, "Market not ended yet");
        require(!market.resolved, "Already resolved");
        
        market.outcome = _outcome;
        market.resolved = true;
        
        emit MarketResolved(_marketId, _outcome);
    }
    
    // ---------- Payout Calculation ----------
    
    function calculatePayout(uint256 _marketId, address _user) public view returns (uint256) {
        Market storage market = markets[_marketId];
        Prediction storage pred = predictions[_marketId][_user];
        
        // Check if user can claim
        if (!market.resolved || !pred.revealed || pred.claimed) return 0;
        
        // Check if user won
        bool isWinner = (pred.side == (market.outcome == 1));
        if (!isWinner) return 0;
        
        // Calculate fair share
        uint256 totalWinners = pred.side ? market.totalYes : market.totalNo;
        uint256 totalLosers = pred.side ? market.totalNo : market.totalYes;
        
        // Bet + proportional share of losers' pool
        uint256 winnersShare = (pred.amount * totalLosers) / totalWinners;
        return pred.amount + winnersShare;
    }
    
    // ---------- Market Stats ----------
    
    function getMarketStats(uint256 _marketId) external view returns (
        uint256 totalYes,
        uint256 totalNo,
        uint256 totalPool,
        uint256 yesOdds,
        uint256 noOdds
    ) {
        Market storage market = markets[_marketId];
        totalYes = market.totalYes;
        totalNo = market.totalNo;
        totalPool = market.totalPool;
        
        // Calculate odds (as percentage * 100)
        if (totalPool > 0) {
            yesOdds = (market.totalYes * 10000) / totalPool;
            noOdds = (market.totalNo * 10000) / totalPool;
        } else {
            yesOdds = 5000; // 50% default
            noOdds = 5000;
        }
    }
    
    // ---------- Reveal & Claim ----------
    
    // pubSignals layout from settlement circuit
    // (circom outputs come first, then public inputs in declaration order):
    // [0] = isWinner    (public output, 0 or 1)
    // [1] = commitment  (public input)
    // [2] = marketOutcome (public input)
    // [3] = marketId    (public input)
    function revealAndClaim(
        uint256 _marketId,
        uint[2] calldata pA,
        uint[2][2] calldata pB,
        uint[2] calldata pC,
        uint[4] calldata pubSignals
    ) external {
        Market storage market = markets[_marketId];
        require(market.resolved, "Market not resolved");
        
        Prediction storage pred = predictions[_marketId][msg.sender];
        require(pred.commitment != 0, "No commitment");
        require(!pred.revealed, "Already revealed");
        
        // Validate public signals match on-chain state
        require(pubSignals[1] == pred.commitment, "Commitment mismatch");
        require(pubSignals[2] == market.outcome, "Outcome mismatch");
        require(pubSignals[3] == _marketId, "Market ID mismatch");
        
        // Verify the ZK proof on-chain
        require(
            settlementVerifier.verifyProof(pA, pB, pC, pubSignals),
            "Invalid ZK proof"
        );
        
        pred.revealed = true;
        
        bool isWinner = pubSignals[0] == 1;
        
        if (isWinner) {
            uint256 payout = calculatePayout(_marketId, msg.sender);
            if (payout > 0) {
                pred.claimed = true;
                payable(msg.sender).transfer(payout);
                emit PredictionRevealed(_marketId, msg.sender, true, payout);
            } else {
                emit PredictionRevealed(_marketId, msg.sender, true, 0);
            }
        } else {
            emit PredictionRevealed(_marketId, msg.sender, false, 0);
        }
    }
    
    // ---------- View Functions ----------
    
    function getMarket(uint256 _marketId) external view returns (
        string memory question,
        uint256 resolutionTime,
        uint256 outcome,
        bool resolved,
        uint256 totalYes,
        uint256 totalNo,
        uint256 totalPool
    ) {
        Market storage market = markets[_marketId];
        return (
            market.question,
            market.resolutionTime,
            market.outcome,
            market.resolved,
            market.totalYes,
            market.totalNo,
            market.totalPool
        );
    }
    
    function getUserPrediction(uint256 _marketId, address _user) external view returns (
        uint256 commitment,
        uint256 amount,
        bool side,
        bool revealed,
        bool claimed
    ) {
        Prediction storage pred = predictions[_marketId][_user];
        return (
            pred.commitment,
            pred.amount,
            pred.side,
            pred.revealed,
            pred.claimed
        );
    }
    
    // ---------- Fallback ----------
    
    receive() external payable {
        // Accept ETH
    }
}
