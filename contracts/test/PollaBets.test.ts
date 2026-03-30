import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { PollaBets, MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PollaBets", function () {
  let pollaBets: PollaBets;
  let usdc: MockUSDC;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let charlie: SignerWithAddress;

  const USDC = (n: number) => ethers.parseUnits(n.toString(), 6);
  const matchId = ethers.id("match-001");

  beforeEach(async function () {
    [owner, treasury, alice, bob, charlie] = await ethers.getSigners();

    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy();

    const PollaBetsFactory = await ethers.getContractFactory("PollaBets");
    pollaBets = await PollaBetsFactory.deploy(
      await usdc.getAddress(),
      treasury.address
    );

    // Mint USDC to users
    await usdc.mint(alice.address, USDC(1000));
    await usdc.mint(bob.address, USDC(1000));
    await usdc.mint(charlie.address, USDC(1000));

    // Approve contract
    const contractAddr = await pollaBets.getAddress();
    await usdc.connect(alice).approve(contractAddr, ethers.MaxUint256);
    await usdc.connect(bob).approve(contractAddr, ethers.MaxUint256);
    await usdc.connect(charlie).approve(contractAddr, ethers.MaxUint256);
  });

  describe("createMarket", function () {
    it("should create a 3-outcome market", async function () {
      const closing = (await time.latest()) + 3600;
      await expect(pollaBets.createMarket(matchId, 3, closing))
        .to.emit(pollaBets, "MarketCreated")
        .withArgs(matchId, 3, closing);

      const market = await pollaBets.getMarket(matchId);
      expect(market.numOutcomes).to.equal(3);
      expect(market.closingTime).to.equal(closing);
      expect(market.resolved).to.be.false;
      expect(market.totalPool).to.equal(0);
    });

    it("should create a 2-outcome market", async function () {
      const closing = (await time.latest()) + 3600;
      await pollaBets.createMarket(matchId, 2, closing);
      const market = await pollaBets.getMarket(matchId);
      expect(market.numOutcomes).to.equal(2);
    });

    it("should revert if market already exists", async function () {
      const closing = (await time.latest()) + 3600;
      await pollaBets.createMarket(matchId, 3, closing);
      await expect(
        pollaBets.createMarket(matchId, 3, closing)
      ).to.be.revertedWith("Market exists");
    });

    it("should revert if not owner", async function () {
      const closing = (await time.latest()) + 3600;
      await expect(
        pollaBets.connect(alice).createMarket(matchId, 3, closing)
      ).to.be.revertedWithCustomError(pollaBets, "OwnableUnauthorizedAccount");
    });

    it("should revert for invalid outcomes", async function () {
      const closing = (await time.latest()) + 3600;
      await expect(
        pollaBets.createMarket(matchId, 1, closing)
      ).to.be.revertedWith("Invalid outcomes");
      await expect(
        pollaBets.createMarket(matchId, 4, closing)
      ).to.be.revertedWith("Invalid outcomes");
    });

    it("should revert if closing time is in the past", async function () {
      const past = (await time.latest()) - 1;
      await expect(
        pollaBets.createMarket(matchId, 3, past)
      ).to.be.revertedWith("Closing time in past");
    });
  });

  describe("placeBet", function () {
    let closing: number;

    beforeEach(async function () {
      closing = (await time.latest()) + 3600;
      await pollaBets.createMarket(matchId, 3, closing);
    });

    it("should place a bet and update pools", async function () {
      await expect(pollaBets.connect(alice).placeBet(matchId, 0, USDC(10)))
        .to.emit(pollaBets, "BetPlaced")
        .withArgs(matchId, alice.address, 0, USDC(10));

      const market = await pollaBets.getMarket(matchId);
      expect(market.totalPool).to.equal(USDC(10));
      expect(market.pools[0]).to.equal(USDC(10));

      const bets = await pollaBets.getUserBet(matchId, alice.address);
      expect(bets[0]).to.equal(USDC(10));
    });

    it("should allow multiple bets from same user on different outcomes", async function () {
      await pollaBets.connect(alice).placeBet(matchId, 0, USDC(10));
      await pollaBets.connect(alice).placeBet(matchId, 1, USDC(5));

      const bets = await pollaBets.getUserBet(matchId, alice.address);
      expect(bets[0]).to.equal(USDC(10));
      expect(bets[1]).to.equal(USDC(5));

      const market = await pollaBets.getMarket(matchId);
      expect(market.totalPool).to.equal(USDC(15));
    });

    it("should revert after closing time", async function () {
      await time.increaseTo(closing + 1);
      await expect(
        pollaBets.connect(alice).placeBet(matchId, 0, USDC(10))
      ).to.be.revertedWith("Market closed");
    });

    it("should revert for invalid outcome", async function () {
      await expect(
        pollaBets.connect(alice).placeBet(matchId, 3, USDC(10))
      ).to.be.revertedWith("Invalid outcome");
    });

    it("should revert for zero amount", async function () {
      await expect(
        pollaBets.connect(alice).placeBet(matchId, 0, 0)
      ).to.be.revertedWith("Zero amount");
    });

    it("should transfer USDC from user to contract", async function () {
      const balBefore = await usdc.balanceOf(alice.address);
      await pollaBets.connect(alice).placeBet(matchId, 0, USDC(10));
      const balAfter = await usdc.balanceOf(alice.address);
      expect(balBefore - balAfter).to.equal(USDC(10));

      const contractBal = await usdc.balanceOf(await pollaBets.getAddress());
      expect(contractBal).to.equal(USDC(10));
    });
  });

  describe("resolve and claim", function () {
    let closing: number;

    beforeEach(async function () {
      closing = (await time.latest()) + 3600;
      await pollaBets.createMarket(matchId, 3, closing);

      // Alice bets $100 on outcome 0 (home win)
      await pollaBets.connect(alice).placeBet(matchId, 0, USDC(100));
      // Bob bets $50 on outcome 1 (draw)
      await pollaBets.connect(bob).placeBet(matchId, 1, USDC(50));
      // Charlie bets $50 on outcome 0 (home win)
      await pollaBets.connect(charlie).placeBet(matchId, 0, USDC(50));
      // Total pool: $200. Home pool: $150. Draw pool: $50.
    });

    it("should resolve market and allow winners to claim", async function () {
      await time.increaseTo(closing + 1);
      await expect(pollaBets.resolve(matchId, 0))
        .to.emit(pollaBets, "MarketResolved")
        .withArgs(matchId, 0);

      const market = await pollaBets.getMarket(matchId);
      expect(market.resolved).to.be.true;
      expect(market.winningOutcome).to.equal(0);
    });

    it("should pay correct proportional amounts minus 5% fee", async function () {
      await time.increaseTo(closing + 1);
      await pollaBets.resolve(matchId, 0);

      // Alice: bet $100 on home (total home pool $150, total pool $200)
      // Gross payout = (100/150) * 200 = 133.333333 USDC
      // Fee = 133.333333 * 5% = 6.666666 USDC
      // Net = 126.666667 USDC (approx, depends on rounding)

      const treasuryBefore = await usdc.balanceOf(treasury.address);
      const aliceBefore = await usdc.balanceOf(alice.address);

      await pollaBets.connect(alice).claim(matchId);

      const aliceAfter = await usdc.balanceOf(alice.address);
      const treasuryAfter = await usdc.balanceOf(treasury.address);

      // Alice: 100 * 200 / 150 = 133333333 (6 decimals)
      const grossAlice = (USDC(100) * USDC(200)) / USDC(150);
      // but we need to compute in wei: 100_000000 * 200_000000 / 150_000000 = 133_333333
      const expectedGross = BigInt(100_000000) * BigInt(200_000000) / BigInt(150_000000);
      const expectedFee = expectedGross * BigInt(500) / BigInt(10000);
      const expectedNet = expectedGross - expectedFee;

      expect(aliceAfter - aliceBefore).to.equal(expectedNet);
      expect(treasuryAfter - treasuryBefore).to.equal(expectedFee);
    });

    it("should pay Charlie correctly", async function () {
      await time.increaseTo(closing + 1);
      await pollaBets.resolve(matchId, 0);

      const charlieBefore = await usdc.balanceOf(charlie.address);
      await pollaBets.connect(charlie).claim(matchId);
      const charlieAfter = await usdc.balanceOf(charlie.address);

      // Charlie: 50 * 200 / 150 = 66666666
      const expectedGross = BigInt(50_000000) * BigInt(200_000000) / BigInt(150_000000);
      const expectedFee = expectedGross * BigInt(500) / BigInt(10000);
      const expectedNet = expectedGross - expectedFee;

      expect(charlieAfter - charlieBefore).to.equal(expectedNet);
    });

    it("should revert double claim", async function () {
      await time.increaseTo(closing + 1);
      await pollaBets.resolve(matchId, 0);

      await pollaBets.connect(alice).claim(matchId);
      await expect(
        pollaBets.connect(alice).claim(matchId)
      ).to.be.revertedWith("Already claimed");
    });

    it("should revert claim for loser", async function () {
      await time.increaseTo(closing + 1);
      await pollaBets.resolve(matchId, 0);

      await expect(
        pollaBets.connect(bob).claim(matchId)
      ).to.be.revertedWith("No winning bet");
    });

    it("should revert resolve by non-owner", async function () {
      await expect(
        pollaBets.connect(alice).resolve(matchId, 0)
      ).to.be.revertedWithCustomError(pollaBets, "OwnableUnauthorizedAccount");
    });

    it("should revert resolve with invalid outcome", async function () {
      await expect(
        pollaBets.resolve(matchId, 5)
      ).to.be.revertedWith("Invalid outcome");
    });

    it("should revert double resolve", async function () {
      await time.increaseTo(closing + 1);
      await pollaBets.resolve(matchId, 0);
      await expect(
        pollaBets.resolve(matchId, 1)
      ).to.be.revertedWith("Already finalized");
    });
  });

  describe("refund when no bets on winning side", function () {
    let closing: number;

    beforeEach(async function () {
      closing = (await time.latest()) + 3600;
      await pollaBets.createMarket(matchId, 3, closing);

      // Everyone bets on outcome 0 and 1, nobody on outcome 2
      await pollaBets.connect(alice).placeBet(matchId, 0, USDC(100));
      await pollaBets.connect(bob).placeBet(matchId, 1, USDC(50));
    });

    it("should auto-cancel when winning outcome has no bets", async function () {
      await time.increaseTo(closing + 1);
      await expect(pollaBets.resolve(matchId, 2))
        .to.emit(pollaBets, "MarketCancelled")
        .withArgs(matchId);

      const market = await pollaBets.getMarket(matchId);
      expect(market.cancelled).to.be.true;
    });

    it("should allow refunds after cancel", async function () {
      await time.increaseTo(closing + 1);
      await pollaBets.resolve(matchId, 2); // no bets on 2 → cancelled

      const aliceBefore = await usdc.balanceOf(alice.address);
      await pollaBets.connect(alice).claimRefund(matchId);
      const aliceAfter = await usdc.balanceOf(alice.address);

      expect(aliceAfter - aliceBefore).to.equal(USDC(100));
    });

    it("should allow manual cancel by owner", async function () {
      await pollaBets.cancelMarket(matchId);
      const market = await pollaBets.getMarket(matchId);
      expect(market.cancelled).to.be.true;

      const bobBefore = await usdc.balanceOf(bob.address);
      await pollaBets.connect(bob).claimRefund(matchId);
      const bobAfter = await usdc.balanceOf(bob.address);
      expect(bobAfter - bobBefore).to.equal(USDC(50));
    });

    it("should revert refund if not cancelled", async function () {
      await expect(
        pollaBets.connect(alice).claimRefund(matchId)
      ).to.be.revertedWith("Not cancelled");
    });

    it("should revert double refund", async function () {
      await pollaBets.cancelMarket(matchId);
      await pollaBets.connect(alice).claimRefund(matchId);
      await expect(
        pollaBets.connect(alice).claimRefund(matchId)
      ).to.be.revertedWith("Already refunded");
    });
  });

  describe("3-outcome market (home/draw/away)", function () {
    let closing: number;

    beforeEach(async function () {
      closing = (await time.latest()) + 3600;
      await pollaBets.createMarket(matchId, 3, closing);
    });

    it("should handle bets across all 3 outcomes", async function () {
      await pollaBets.connect(alice).placeBet(matchId, 0, USDC(100)); // home
      await pollaBets.connect(bob).placeBet(matchId, 1, USDC(100)); // draw
      await pollaBets.connect(charlie).placeBet(matchId, 2, USDC(100)); // away

      const market = await pollaBets.getMarket(matchId);
      expect(market.totalPool).to.equal(USDC(300));
      expect(market.pools[0]).to.equal(USDC(100));
      expect(market.pools[1]).to.equal(USDC(100));
      expect(market.pools[2]).to.equal(USDC(100));
    });

    it("should pay draw winner correctly (outcome 1)", async function () {
      await pollaBets.connect(alice).placeBet(matchId, 0, USDC(100));
      await pollaBets.connect(bob).placeBet(matchId, 1, USDC(50));
      await pollaBets.connect(charlie).placeBet(matchId, 2, USDC(50));
      // Total: 200. Draw pool: 50. Bob gets 200/50 * 50 = 200 gross

      await time.increaseTo(closing + 1);
      await pollaBets.resolve(matchId, 1);

      const bobBefore = await usdc.balanceOf(bob.address);
      await pollaBets.connect(bob).claim(matchId);
      const bobAfter = await usdc.balanceOf(bob.address);

      // Gross: 50 * 200 / 50 = 200 USDC. Fee: 10 USDC. Net: 190.
      const expectedGross = BigInt(200_000000);
      const expectedFee = expectedGross * BigInt(500) / BigInt(10000);
      const expectedNet = expectedGross - expectedFee;

      expect(bobAfter - bobBefore).to.equal(expectedNet);
    });
  });

  describe("getOdds", function () {
    it("should return current odds as fixed-point (x10000)", async function () {
      const closing = (await time.latest()) + 3600;
      await pollaBets.createMarket(matchId, 3, closing);

      await pollaBets.connect(alice).placeBet(matchId, 0, USDC(100));
      await pollaBets.connect(bob).placeBet(matchId, 1, USDC(50));
      // Total: 150. Home odds: 150/100 = 1.5x → 15000. Draw odds: 150/50 = 3x → 30000.

      const odds = await pollaBets.getOdds(matchId);
      expect(odds[0]).to.equal(15000); // 1.5x
      expect(odds[1]).to.equal(30000); // 3.0x
      expect(odds[2]).to.equal(0);     // no bets
    });

    it("should return 0 for outcomes with no bets", async function () {
      const closing = (await time.latest()) + 3600;
      await pollaBets.createMarket(matchId, 2, closing);

      const odds = await pollaBets.getOdds(matchId);
      expect(odds[0]).to.equal(0);
      expect(odds[1]).to.equal(0);
    });
  });

  describe("treasury", function () {
    it("should allow owner to change treasury", async function () {
      await pollaBets.setTreasury(alice.address);
      expect(await pollaBets.treasury()).to.equal(alice.address);
    });

    it("should send fees to treasury, not to owner/operator", async function () {
      const closing = (await time.latest()) + 3600;
      await pollaBets.createMarket(matchId, 2, closing);

      await pollaBets.connect(alice).placeBet(matchId, 0, USDC(100));
      await pollaBets.connect(bob).placeBet(matchId, 1, USDC(100));

      await time.increaseTo(closing + 1);
      await pollaBets.resolve(matchId, 0);

      // Verify owner and treasury are different addresses
      expect(await pollaBets.owner()).to.equal(owner.address);
      expect(await pollaBets.treasury()).to.equal(treasury.address);
      expect(owner.address).to.not.equal(treasury.address);

      const ownerBefore = await usdc.balanceOf(owner.address);
      const treasuryBefore = await usdc.balanceOf(treasury.address);

      await pollaBets.connect(alice).claim(matchId);

      const ownerAfter = await usdc.balanceOf(owner.address);
      const treasuryAfter = await usdc.balanceOf(treasury.address);

      // Owner (operator) balance unchanged — no fees
      expect(ownerAfter).to.equal(ownerBefore);
      // Treasury received the fee
      expect(treasuryAfter).to.be.greaterThan(treasuryBefore);
    });

    it("should accumulate fees across multiple claims", async function () {
      const closing = (await time.latest()) + 3600;
      await pollaBets.createMarket(matchId, 2, closing);

      await pollaBets.connect(alice).placeBet(matchId, 0, USDC(100));
      await pollaBets.connect(bob).placeBet(matchId, 0, USDC(100));
      await pollaBets.connect(charlie).placeBet(matchId, 1, USDC(200));
      // Total: 400. Outcome 0 pool: 200. If outcome 0 wins, each gets 200 gross.

      await time.increaseTo(closing + 1);
      await pollaBets.resolve(matchId, 0);

      const treasuryBefore = await usdc.balanceOf(treasury.address);
      await pollaBets.connect(alice).claim(matchId);
      await pollaBets.connect(bob).claim(matchId);
      const treasuryAfter = await usdc.balanceOf(treasury.address);

      // Each gross = 100 * 400 / 200 = 200. Fee each = 10. Total fees = 20.
      expect(treasuryAfter - treasuryBefore).to.equal(USDC(20));
    });
  });
});
