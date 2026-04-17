// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SabiParlayPools
/// @notice Pari-mutuel parlay-ticket markets with atomic settlement and pro-rata payouts.
/// @dev Sibling contract to PollaBets. Settlement delivers rake, cascades empty tiers down
///      (5/5 → 4/5 → 3/5), and distributes pro-rata by stake within each surviving tier.
///      If all three tiers are empty, the orphan pool flows to treasury in the same tx.
///
///      Batching note: Celo block gas limit is ~30M. Per-winner distribution costs ~40k gas,
///      so the practical ceiling is ~500 winners in a single settleAndPayout call. Larger
///      tiers will require chunked settlement via a future settlePartial helper.
contract SabiParlayPools is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public operator;
    address public treasury;

    uint256 public constant RAKE_BPS = 500;      // 5.00%
    uint256 public constant TIER_5_BPS = 5500;   // 55% of net
    uint256 public constant TIER_4_BPS = 3000;   // 30% of net
    uint256 public constant TIER_3_BPS = 1500;   // 15% of net
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint8   public constant PICKS_MASK = 0x1F;   // 5 questions per market

    struct Market {
        uint64 locksAt;
        uint8 resolution;
        bool settled;
        uint256 grossPool;
        uint256 tier5Stakes;
        uint256 tier4Stakes;
        uint256 tier3Stakes;
        uint256 tier5Pool;
        uint256 tier4Pool;
        uint256 tier3Pool;
    }

    struct Ticket {
        address user;  // 20 bytes
        uint96 stake;  // 12 bytes — packs with `user` in one slot. Max ~7.9e28 wei USDC, far above any ticket.
        uint8 picks;   // bit i = pick for question i+1 (1=A, 0=B)
        bool paid;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(uint256 => Ticket)) public tickets;
    mapping(uint256 => uint256) public ticketCount;

    event MarketCreated(uint256 indexed marketId, uint64 locksAt);
    event TicketPlaced(uint256 indexed marketId, uint256 indexed ticketId, address indexed user, uint256 stake, uint8 picks);
    event MarketSettled(uint256 indexed marketId, uint8 resolution, uint256 tier5Pool, uint256 tier4Pool, uint256 tier3Pool);
    event PayoutDelivered(uint256 indexed marketId, uint256 indexed ticketId, address indexed user, uint256 amount);
    event OrphanPoolSwept(uint256 indexed marketId, uint256 amount);

    modifier onlyOperator() {
        require(msg.sender == operator, "not operator");
        _;
    }

    constructor(address _usdc, address _operator, address _treasury) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        operator = _operator;
        treasury = _treasury;
    }

    // ─── Admin ───────────────────────────────────────────────

    function createMarket(uint256 marketId, uint64 locksAt) external onlyOperator {
        require(markets[marketId].locksAt == 0, "exists");
        require(locksAt > block.timestamp, "past");
        markets[marketId].locksAt = locksAt;
        emit MarketCreated(marketId, locksAt);
    }

    function setOperator(address _op) external onlyOwner { operator = _op; }
    function setTreasury(address _t) external onlyOwner { treasury = _t; }

    // ─── User Actions ────────────────────────────────────────

    function placeTicket(uint256 marketId, uint8 picks, uint256 stake) external nonReentrant {
        Market storage m = markets[marketId];
        require(m.locksAt != 0 && block.timestamp < m.locksAt, "closed");
        require(stake > 0, "zero stake");
        require(stake <= type(uint96).max, "stake too large");
        require(picks < 32, "bad picks");
        usdc.safeTransferFrom(msg.sender, address(this), stake);
        uint256 tid = ticketCount[marketId]++;
        tickets[marketId][tid] = Ticket(msg.sender, uint96(stake), picks, false);
        m.grossPool += stake;
        emit TicketPlaced(marketId, tid, msg.sender, stake, picks);
    }

    // ─── Settlement ──────────────────────────────────────────

    /// @notice Settles a market atomically: takes rake, cascades empty tiers, and pays all winners.
    /// @dev Operator supplies the winner ticket IDs for each tier (off-chain resolution).
    ///      Each ID is verified on-chain: (a) popcount(picks XOR resolution MATCHES) == tier, (b) not already paid.
    ///      Residual dust from the net-vs-tier-sum rounding and any orphaned tier pool flow to treasury.
    function settleAndPayout(
        uint256 marketId,
        uint8 resolution,
        uint256[] calldata winnerTicketIds_5,
        uint256[] calldata winnerTicketIds_4,
        uint256[] calldata winnerTicketIds_3
    ) external onlyOperator nonReentrant {
        Market storage m = markets[marketId];
        require(m.locksAt != 0 && !m.settled, "bad state");
        require(block.timestamp >= m.locksAt, "too early");
        require(resolution < 32, "bad resolution");

        m.resolution = resolution;
        m.settled = true;

        uint256 rake = (m.grossPool * RAKE_BPS) / BPS_DENOMINATOR;
        uint256 net = m.grossPool - rake;
        if (rake > 0) usdc.safeTransfer(treasury, rake);

        uint256 s5 = _verifyAndSumStakes(marketId, winnerTicketIds_5, resolution, 5);
        uint256 s4 = _verifyAndSumStakes(marketId, winnerTicketIds_4, resolution, 4);
        uint256 s3 = _verifyAndSumStakes(marketId, winnerTicketIds_3, resolution, 3);

        m.tier5Stakes = s5;
        m.tier4Stakes = s4;
        m.tier3Stakes = s3;

        uint256 alloc5 = (net * TIER_5_BPS) / BPS_DENOMINATOR;
        uint256 alloc4 = (net * TIER_4_BPS) / BPS_DENOMINATOR;
        uint256 alloc3 = (net * TIER_3_BPS) / BPS_DENOMINATOR;

        // Cascade empty tiers DOWN.
        if (s5 == 0) { alloc4 += alloc5; alloc5 = 0; }
        if (s4 == 0) { alloc3 += alloc4; alloc4 = 0; }

        uint256 unclaimable = 0;
        if (s3 == 0) { unclaimable = alloc3; alloc3 = 0; }

        // Residual from bps rounding (net vs tier sum) also flows to treasury.
        uint256 allocated = alloc5 + alloc4 + alloc3 + unclaimable;
        if (allocated < net) {
            unclaimable += (net - allocated);
        }

        m.tier5Pool = alloc5;
        m.tier4Pool = alloc4;
        m.tier3Pool = alloc3;

        emit MarketSettled(marketId, resolution, alloc5, alloc4, alloc3);

        _distributeTier(marketId, winnerTicketIds_5, alloc5, s5);
        _distributeTier(marketId, winnerTicketIds_4, alloc4, s4);
        _distributeTier(marketId, winnerTicketIds_3, alloc3, s3);

        if (unclaimable > 0) {
            usdc.safeTransfer(treasury, unclaimable);
            emit OrphanPoolSwept(marketId, unclaimable);
        }
    }

    // ─── Internals ───────────────────────────────────────────

    /// @dev Verifies each ticket id belongs to the claimed tier and marks it paid to prevent
    ///      any later duplicate — whether within the same array or across tier arrays — from
    ///      being re-paid. Mutating (not view) so the `paid` flag fires on first sight.
    function _verifyAndSumStakes(
        uint256 marketId,
        uint256[] calldata ticketIds,
        uint8 resolution,
        uint8 requiredScore
    ) internal returns (uint256 total) {
        uint256 n = ticketIds.length;
        for (uint256 i = 0; i < n; i++) {
            Ticket storage t = tickets[marketId][ticketIds[i]];
            require(t.user != address(0), "bad tid");
            require(!t.paid, "dup tid");
            uint8 score = _matchCount(t.picks, resolution);
            require(score == requiredScore, "wrong tier");
            t.paid = true;
            total += t.stake;
        }
    }

    function _distributeTier(
        uint256 marketId,
        uint256[] calldata ticketIds,
        uint256 tierPool,
        uint256 tierStakes
    ) internal {
        if (tierPool == 0 || tierStakes == 0) return;
        uint256 totalDistributed = 0;
        uint256 n = ticketIds.length;
        for (uint256 i = 0; i < n; i++) {
            Ticket storage t = tickets[marketId][ticketIds[i]];
            uint256 payout = (tierPool * t.stake) / tierStakes;
            if (i == n - 1) {
                // Last winner absorbs rounding dust so the tier pool distributes exactly.
                payout = tierPool - totalDistributed;
            }
            totalDistributed += payout;
            if (payout > 0) usdc.safeTransfer(t.user, payout);
            emit PayoutDelivered(marketId, ticketIds[i], t.user, payout);
        }
    }

    /// @dev Counts how many of the 5 picks match the resolution.
    ///      picks XOR resolution => 1-bits where they differ.
    ///      XOR with 0x1F inverts within the 5-bit window => 1-bits where they match.
    function _matchCount(uint8 picks, uint8 resolution) internal pure returns (uint8) {
        uint8 diff = (picks ^ resolution) & PICKS_MASK;
        uint8 match_ = diff ^ PICKS_MASK;
        return _popcount(match_);
    }

    function _popcount(uint8 x) internal pure returns (uint8 c) {
        while (x != 0) {
            c++;
            x &= (x - 1);
        }
    }

    // ─── Views ───────────────────────────────────────────────

    function getMarket(uint256 marketId)
        external
        view
        returns (
            uint64 locksAt,
            uint8 resolution,
            bool settled,
            uint256 grossPool,
            uint256 tier5Stakes,
            uint256 tier4Stakes,
            uint256 tier3Stakes,
            uint256 tier5Pool,
            uint256 tier4Pool,
            uint256 tier3Pool
        )
    {
        Market storage m = markets[marketId];
        return (
            m.locksAt,
            m.resolution,
            m.settled,
            m.grossPool,
            m.tier5Stakes,
            m.tier4Stakes,
            m.tier3Stakes,
            m.tier5Pool,
            m.tier4Pool,
            m.tier3Pool
        );
    }

    function getTicket(uint256 marketId, uint256 ticketId)
        external
        view
        returns (address user, uint256 stake, uint8 picks, bool paid)
    {
        Ticket storage t = tickets[marketId][ticketId];
        return (t.user, uint256(t.stake), t.picks, t.paid);
    }
}
