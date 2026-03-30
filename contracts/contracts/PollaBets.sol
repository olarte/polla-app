// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PollaBets is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public treasury;
    uint256 public constant FEE_BPS = 500; // 5%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    struct Market {
        uint8 numOutcomes;
        uint256 closingTime;
        bool resolved;
        bool cancelled;
        uint8 winningOutcome;
        uint256 totalPool;
    }

    // marketId => Market
    mapping(bytes32 => Market) public markets;
    // marketId => outcome => pool
    mapping(bytes32 => mapping(uint8 => uint256)) public poolPerOutcome;
    // marketId => user => outcome => amount
    mapping(bytes32 => mapping(address => mapping(uint8 => uint256))) public userBets;
    // marketId => user => total bet across all outcomes
    mapping(bytes32 => mapping(address => uint256)) public userTotalBet;
    // marketId => user => claimed
    mapping(bytes32 => mapping(address => bool)) public claimed;

    event MarketCreated(bytes32 indexed marketId, uint8 numOutcomes, uint256 closingTime);
    event BetPlaced(bytes32 indexed marketId, address indexed user, uint8 outcome, uint256 amount);
    event MarketResolved(bytes32 indexed marketId, uint8 winningOutcome);
    event MarketCancelled(bytes32 indexed marketId);
    event Claimed(bytes32 indexed marketId, address indexed user, uint256 amount);
    event Refunded(bytes32 indexed marketId, address indexed user, uint256 amount);

    constructor(address _usdc, address _treasury) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    // ─── Admin ───────────────────────────────────────────────

    function createMarket(
        bytes32 matchId,
        uint8 numOutcomes,
        uint256 closingTime
    ) external onlyOwner {
        bytes32 marketId = matchId;
        require(markets[marketId].numOutcomes == 0, "Market exists");
        require(numOutcomes >= 2 && numOutcomes <= 3, "Invalid outcomes");
        require(closingTime > block.timestamp, "Closing time in past");

        markets[marketId] = Market({
            numOutcomes: numOutcomes,
            closingTime: closingTime,
            resolved: false,
            cancelled: false,
            winningOutcome: 0,
            totalPool: 0
        });

        emit MarketCreated(marketId, numOutcomes, closingTime);
    }

    function resolve(bytes32 marketId, uint8 winningOutcome) external onlyOwner {
        Market storage m = markets[marketId];
        require(m.numOutcomes > 0, "Market not found");
        require(!m.resolved && !m.cancelled, "Already finalized");
        require(winningOutcome < m.numOutcomes, "Invalid outcome");

        m.resolved = true;
        m.winningOutcome = winningOutcome;

        // If nobody bet on the winning outcome, mark as cancelled for refunds
        if (poolPerOutcome[marketId][winningOutcome] == 0) {
            m.cancelled = true;
            emit MarketCancelled(marketId);
        }

        emit MarketResolved(marketId, winningOutcome);
    }

    function cancelMarket(bytes32 marketId) external onlyOwner {
        Market storage m = markets[marketId];
        require(m.numOutcomes > 0, "Market not found");
        require(!m.resolved && !m.cancelled, "Already finalized");

        m.cancelled = true;
        emit MarketCancelled(marketId);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    // ─── User Actions ────────────────────────────────────────

    function placeBet(
        bytes32 marketId,
        uint8 outcome,
        uint256 amount
    ) external nonReentrant {
        Market storage m = markets[marketId];
        require(m.numOutcomes > 0, "Market not found");
        require(!m.resolved && !m.cancelled, "Market finalized");
        require(block.timestamp < m.closingTime, "Market closed");
        require(outcome < m.numOutcomes, "Invalid outcome");
        require(amount > 0, "Zero amount");

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        m.totalPool += amount;
        poolPerOutcome[marketId][outcome] += amount;
        userBets[marketId][msg.sender][outcome] += amount;
        userTotalBet[marketId][msg.sender] += amount;

        emit BetPlaced(marketId, msg.sender, outcome, amount);
    }

    function claim(bytes32 marketId) external nonReentrant {
        Market storage m = markets[marketId];
        require(m.resolved, "Not resolved");
        require(!m.cancelled, "Market cancelled, use claimRefund");
        require(!claimed[marketId][msg.sender], "Already claimed");

        uint256 userWinBet = userBets[marketId][msg.sender][m.winningOutcome];
        require(userWinBet > 0, "No winning bet");

        claimed[marketId][msg.sender] = true;

        uint256 winnerPool = poolPerOutcome[marketId][m.winningOutcome];
        // Gross payout = user share of total pool
        uint256 grossPayout = (userWinBet * m.totalPool) / winnerPool;
        // Fee on profit only
        uint256 fee = (grossPayout * FEE_BPS) / BPS_DENOMINATOR;
        uint256 netPayout = grossPayout - fee;

        usdc.safeTransfer(treasury, fee);
        usdc.safeTransfer(msg.sender, netPayout);

        emit Claimed(marketId, msg.sender, netPayout);
    }

    function claimRefund(bytes32 marketId) external nonReentrant {
        Market storage m = markets[marketId];
        require(m.cancelled, "Not cancelled");
        require(!claimed[marketId][msg.sender], "Already refunded");

        uint256 totalBet = userTotalBet[marketId][msg.sender];
        require(totalBet > 0, "No bets");

        claimed[marketId][msg.sender] = true;
        usdc.safeTransfer(msg.sender, totalBet);

        emit Refunded(marketId, msg.sender, totalBet);
    }

    // ─── View Functions ──────────────────────────────────────

    function getMarket(bytes32 marketId)
        external
        view
        returns (
            uint8 numOutcomes,
            uint256 closingTime,
            bool resolved,
            bool cancelled,
            uint8 winningOutcome,
            uint256 totalPool,
            uint256[] memory pools
        )
    {
        Market storage m = markets[marketId];
        pools = new uint256[](m.numOutcomes);
        for (uint8 i = 0; i < m.numOutcomes; i++) {
            pools[i] = poolPerOutcome[marketId][i];
        }
        return (
            m.numOutcomes,
            m.closingTime,
            m.resolved,
            m.cancelled,
            m.winningOutcome,
            m.totalPool,
            pools
        );
    }

    function getUserBet(bytes32 marketId, address user)
        external
        view
        returns (uint256[] memory bets)
    {
        uint8 n = markets[marketId].numOutcomes;
        bets = new uint256[](n);
        for (uint8 i = 0; i < n; i++) {
            bets[i] = userBets[marketId][user][i];
        }
    }

    function getOdds(bytes32 marketId)
        external
        view
        returns (uint256[] memory odds)
    {
        Market storage m = markets[marketId];
        odds = new uint256[](m.numOutcomes);
        for (uint8 i = 0; i < m.numOutcomes; i++) {
            uint256 pool = poolPerOutcome[marketId][i];
            if (pool == 0 || m.totalPool == 0) {
                odds[i] = 0; // no bets on this outcome
            } else {
                // Odds as fixed-point with 4 decimals (e.g., 24000 = 2.4x)
                odds[i] = (m.totalPool * 10_000) / pool;
            }
        }
    }
}
