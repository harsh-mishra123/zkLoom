// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IVerifier.sol";

contract zkPredictionMarket {
    address public owner;
    uint256 public marketCount;
    IVerifier public settlementVerifier;

    struct Market {
        string question;
        address creator;
        uint256 resolutionTime;
        uint256 createdAt;
        uint256 outcome;      // 0 = unresolved, 1 = YES, 2 = NO
        uint256 totalYes;
        uint256 totalNo;
        uint256 totalPool;
        bool resolved;
    }

    struct Prediction {
        uint256 commitment;
        uint256 amount;
        bool side;       // true = YES, false = NO
        bool revealed;
        bool claimed;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Prediction)) public predictions;

    event MarketCreated(uint256 indexed marketId, string question, uint256 resolutionTime);
    event PredictionCommitted(uint256 indexed marketId, address indexed user, uint256 commitment, uint256 amount, bool side);
    event MarketResolved(uint256 indexed marketId, uint256 outcome);
    event PredictionRevealed(uint256 indexed marketId, address indexed user, bool isWinner, uint256 payout);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _settlementVerifier) {
        owner = msg.sender;
        settlementVerifier = IVerifier(_settlementVerifier);
    }

    function createMarket(string calldata _question, uint256 _resolutionTime) external returns (uint256) {
        require(_resolutionTime > block.timestamp, "Resolution time must be in the future");

        uint256 marketId = marketCount;
        markets[marketId] = Market({
            question: _question,
            creator: msg.sender,
            resolutionTime: _resolutionTime,
            createdAt: block.timestamp,
            outcome: 0,
            totalYes: 0,
            totalNo: 0,
            totalPool: 0,
            resolved: false
        });

        marketCount++;

        emit MarketCreated(marketId, _question, _resolutionTime);
        return marketId;
    }

    function commitPrediction(uint256 _marketId, uint256 _commitment, bool _side) external payable {
        require(_marketId < marketCount, "Market does not exist");
        Market storage market = markets[_marketId];
        require(!market.resolved, "Market already resolved");
        require(msg.value > 0, "Must stake ETH");
        require(predictions[_marketId][msg.sender].amount == 0, "Already committed");

        predictions[_marketId][msg.sender] = Prediction({
            commitment: _commitment,
            amount: msg.value,
            side: _side,
            revealed: false,
            claimed: false
        });

        if (_side) {
            market.totalYes += msg.value;
        } else {
            market.totalNo += msg.value;
        }
        market.totalPool += msg.value;

        emit PredictionCommitted(_marketId, msg.sender, _commitment, msg.value, _side);
    }

    function resolveMarket(uint256 _marketId, uint256 _outcome) external {
        require(_marketId < marketCount, "Market does not exist");
        Market storage market = markets[_marketId];
        require(msg.sender == market.creator, "Only market creator can resolve");
        require(!market.resolved, "Already resolved");
        require(_outcome == 1 || _outcome == 2, "Outcome must be 1 (YES) or 2 (NO)");

        market.outcome = _outcome;
        market.resolved = true;

        emit MarketResolved(_marketId, _outcome);
    }

    function revealAndClaim(
        uint256 _marketId,
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[4] calldata pubSignals
    ) external {
        require(_marketId < marketCount, "Market does not exist");
        Market storage market = markets[_marketId];
        require(market.resolved, "Market not resolved");

        Prediction storage pred = predictions[_marketId][msg.sender];
        require(pred.amount > 0, "No prediction found");
        require(!pred.revealed, "Already revealed");
        require(!pred.claimed, "Already claimed");

        // pubSignals: [commitment, marketOutcome, marketId, isWinner]
        require(pubSignals[0] == pred.commitment, "Commitment mismatch");
        require(pubSignals[1] == market.outcome, "Outcome mismatch");
        require(pubSignals[2] == _marketId, "Market ID mismatch");

        // Verify the ZK proof
        require(settlementVerifier.verifyProof(pA, pB, pC, pubSignals), "Invalid proof");

        pred.revealed = true;

        bool isWinner = pubSignals[3] == 1;
        uint256 payout = 0;

        if (isWinner) {
            payout = calculatePayout(_marketId, msg.sender);
            pred.claimed = true;

            (bool success, ) = payable(msg.sender).call{value: payout}("");
            require(success, "Transfer failed");
        }

        emit PredictionRevealed(_marketId, msg.sender, isWinner, payout);
    }

    function calculatePayout(uint256 _marketId, address _user) public view returns (uint256) {
        Market storage market = markets[_marketId];
        Prediction storage pred = predictions[_marketId][_user];

        if (!market.resolved || pred.amount == 0) return 0;

        bool predictedYes = pred.side;
        bool outcomeYes = market.outcome == 1;

        if (predictedYes != outcomeYes) return 0;

        uint256 winningSideTotal = outcomeYes ? market.totalYes : market.totalNo;

        if (winningSideTotal == 0) return 0;

        // Payout = user's share of winning side * total pool
        return (pred.amount * market.totalPool) / winningSideTotal;
    }

    function getMarket(uint256 _marketId) external view returns (
        string memory question,
        uint256 resolutionTime,
        uint256 outcome,
        bool resolved,
        uint256 totalYes,
        uint256 totalNo,
        uint256 totalPool,
        address creator
    ) {
        Market storage market = markets[_marketId];
        return (
            market.question,
            market.resolutionTime,
            market.outcome,
            market.resolved,
            market.totalYes,
            market.totalNo,
            market.totalPool,
            market.creator
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

    function getMarketStats(uint256 _marketId) external view returns (
        uint256 totalYes,
        uint256 totalNo,
        uint256 totalPool,
        uint256 yesOdds,
        uint256 noOdds
    ) {
        Market storage market = markets[_marketId];
        uint256 _yesOdds = 0;
        uint256 _noOdds = 0;

        if (market.totalPool > 0) {
            _yesOdds = (market.totalYes * 10000) / market.totalPool;
            _noOdds = (market.totalNo * 10000) / market.totalPool;
        }

        return (
            market.totalYes,
            market.totalNo,
            market.totalPool,
            _yesOdds,
            _noOdds
        );
    }
}
