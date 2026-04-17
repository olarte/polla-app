import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SabiParlayPools, MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const USDC = (n: number | bigint) => ethers.parseUnits(n.toString(), 6);
const BPS = 10_000n;
const RAKE_BPS = 500n;
const T5_BPS = 5500n;
const T4_BPS = 3000n;
const T3_BPS = 1500n;
const PICKS_MASK = 0x1f;

function popcount(x: number): number {
  let c = 0;
  let v = x & PICKS_MASK;
  while (v !== 0) {
    c++;
    v &= v - 1;
  }
  return c;
}

function matchCount(picks: number, resolution: number): number {
  const diff = (picks ^ resolution) & PICKS_MASK;
  return popcount(diff ^ PICKS_MASK);
}

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

describe("SabiParlayPools", function () {
  let pools: SabiParlayPools;
  let usdc: MockUSDC;
  let owner: SignerWithAddress;
  let operator: SignerWithAddress;
  let treasury: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let dave: SignerWithAddress;
  let erin: SignerWithAddress;
  let buyers: SignerWithAddress[];

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    [owner, operator, treasury, alice, bob, carol, dave, erin] = signers;
    buyers = [alice, bob, carol, dave, erin];

    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy();

    const PoolsFactory = await ethers.getContractFactory("SabiParlayPools");
    pools = await PoolsFactory.deploy(
      await usdc.getAddress(),
      operator.address,
      treasury.address
    );

    const poolsAddr = await pools.getAddress();
    for (const b of buyers) {
      await usdc.mint(b.address, USDC(1_000_000));
      await usdc.connect(b).approve(poolsAddr, ethers.MaxUint256);
    }
  });

  // ─── helpers ─────────────────────────────────────────────

  async function newMarket(marketId: bigint, delay = 3600) {
    const locksAt = BigInt((await time.latest()) + delay);
    await pools.connect(operator).createMarket(marketId, locksAt);
    return locksAt;
  }

  async function placeTicket(
    buyer: SignerWithAddress,
    marketId: bigint,
    picks: number,
    stake: bigint
  ) {
    const before = await pools.ticketCount(marketId);
    await pools.connect(buyer).placeTicket(marketId, picks, stake);
    return before;
  }

  // ─── 1. placeTicket increments pool ───────────────────────

  it("test_PlaceTicket_IncrementsPool", async function () {
    const mid = 1n;
    await newMarket(mid);

    await placeTicket(alice, mid, 0b11111, USDC(10));
    await placeTicket(bob, mid, 0b11110, USDC(25));
    await placeTicket(carol, mid, 0b10101, USDC(5));

    const m = await pools.getMarket(mid);
    expect(m.grossPool).to.equal(USDC(40));
    expect(await pools.ticketCount(mid)).to.equal(3n);

    const t0 = await pools.getTicket(mid, 0);
    expect(t0.user).to.equal(alice.address);
    expect(t0.stake).to.equal(USDC(10));
    expect(t0.picks).to.equal(0b11111);
    expect(t0.paid).to.be.false;
  });

  // ─── 2. reverts after lock ────────────────────────────────

  it("test_PlaceTicket_RevertsAfterLock", async function () {
    const mid = 2n;
    const locksAt = await newMarket(mid);

    // At locksAt exactly: should revert (block.timestamp < locksAt required)
    await time.increaseTo(locksAt);
    await expect(
      pools.connect(alice).placeTicket(mid, 0b11111, USDC(10))
    ).to.be.revertedWith("closed");

    // After locksAt: still reverts
    await time.increaseTo(locksAt + 100n);
    await expect(
      pools.connect(alice).placeTicket(mid, 0b11111, USDC(10))
    ).to.be.revertedWith("closed");
  });

  // ─── 3. rake to treasury ──────────────────────────────────

  it("test_SettleAndPayout_RakeGoesToTreasury", async function () {
    const mid = 3n;
    const locksAt = await newMarket(mid);

    // All three tiers filled so nothing cascades to treasury beyond the rake.
    // Gross pool: 100 USDC → 5% rake = 5 USDC exactly.
    const resolution = 0b11111;
    await placeTicket(alice, mid, 0b11111, USDC(60)); // 5/5
    await placeTicket(bob, mid, 0b11110, USDC(30));   // 4/5
    await placeTicket(carol, mid, 0b11100, USDC(10)); // 3/5
    const grossPool = USDC(100);
    const expectedRake = (grossPool * RAKE_BPS) / BPS;

    await time.increaseTo(locksAt);

    const treasuryBefore = await usdc.balanceOf(treasury.address);

    await pools.connect(operator).settleAndPayout(
      mid,
      resolution,
      [0],
      [1],
      [2]
    );

    const treasuryAfter = await usdc.balanceOf(treasury.address);
    expect(treasuryAfter - treasuryBefore).to.equal(expectedRake);
  });

  // ─── 4. pays all winners atomically ───────────────────────

  it("test_SettleAndPayout_PaysAllWinnersAtomically", async function () {
    const mid = 4n;
    const locksAt = await newMarket(mid);

    // Alice: 5/5. Bob: 4/5. Carol: 3/5.
    const resolution = 0b11111;
    await placeTicket(alice, mid, 0b11111, USDC(100));
    await placeTicket(bob, mid, 0b11110, USDC(100));
    await placeTicket(carol, mid, 0b11100, USDC(100));

    await time.increaseTo(locksAt);

    const aliceBefore = await usdc.balanceOf(alice.address);
    const bobBefore = await usdc.balanceOf(bob.address);
    const carolBefore = await usdc.balanceOf(carol.address);

    await pools.connect(operator).settleAndPayout(
      mid,
      resolution,
      [0],
      [1],
      [2]
    );

    expect(await usdc.balanceOf(alice.address)).to.be.greaterThan(aliceBefore);
    expect(await usdc.balanceOf(bob.address)).to.be.greaterThan(bobBefore);
    expect(await usdc.balanceOf(carol.address)).to.be.greaterThan(carolBefore);

    const m = await pools.getMarket(mid);
    expect(m.settled).to.be.true;
    expect(m.tier5Stakes).to.equal(USDC(100));
    expect(m.tier4Stakes).to.equal(USDC(100));
    expect(m.tier3Stakes).to.equal(USDC(100));

    // All USDC should be out of the contract
    expect(await usdc.balanceOf(await pools.getAddress())).to.equal(0n);
  });

  // ─── 5. cascade when no 5/5 ───────────────────────────────

  it("test_SettleAndPayout_CascadeWhenNo5of5", async function () {
    const mid = 5n;
    const locksAt = await newMarket(mid);

    // No 5/5 winners. Bob: 4/5. Carol: 3/5.
    const resolution = 0b11111;
    await placeTicket(alice, mid, 0b00000, USDC(100)); // 0/5 — not a winner
    await placeTicket(bob, mid, 0b11110, USDC(100));   // 4/5
    await placeTicket(carol, mid, 0b11100, USDC(100)); // 3/5

    await time.increaseTo(locksAt);

    const grossPool = USDC(300);
    const rake = (grossPool * RAKE_BPS) / BPS;
    const net = grossPool - rake;
    // 5/5 cascades into 4/5: alloc4 = (55% + 30%) = 85% of net, alloc3 = 15% of net
    const alloc5 = (net * T5_BPS) / BPS; // 55%
    const alloc4 = (net * T4_BPS) / BPS; // 30%
    const alloc3 = (net * T3_BPS) / BPS; // 15%
    const expectedBobShare = alloc4 + alloc5; // cascaded
    const expectedCarolShare = alloc3;

    const bobBefore = await usdc.balanceOf(bob.address);
    const carolBefore = await usdc.balanceOf(carol.address);

    await pools.connect(operator).settleAndPayout(
      mid,
      resolution,
      [], // no 5/5
      [1], // bob 4/5
      [2]  // carol 3/5
    );

    const bobReceived = (await usdc.balanceOf(bob.address)) - bobBefore;
    const carolReceived = (await usdc.balanceOf(carol.address)) - carolBefore;

    expect(bobReceived).to.equal(expectedBobShare);
    expect(carolReceived).to.equal(expectedCarolShare);

    const m = await pools.getMarket(mid);
    expect(m.tier5Pool).to.equal(0n);
    expect(m.tier4Pool).to.equal(expectedBobShare);
    expect(m.tier3Pool).to.equal(expectedCarolShare);
  });

  // ─── 6. cascade when no 5/5 and no 4/5 ────────────────────

  it("test_SettleAndPayout_CascadeWhenNo5or4", async function () {
    const mid = 6n;
    const locksAt = await newMarket(mid);

    const resolution = 0b11111;
    await placeTicket(alice, mid, 0b00000, USDC(100)); // 0/5 loser
    await placeTicket(bob, mid, 0b11100, USDC(100));   // 3/5
    await placeTicket(carol, mid, 0b10100, USDC(100)); // 2/5 loser

    await time.increaseTo(locksAt);

    const grossPool = USDC(300);
    const rake = (grossPool * RAKE_BPS) / BPS;
    const net = grossPool - rake;

    // Entire net cascades to 3/5.
    const bobBefore = await usdc.balanceOf(bob.address);

    await pools.connect(operator).settleAndPayout(
      mid,
      resolution,
      [], // no 5/5
      [], // no 4/5
      [1] // bob 3/5
    );

    const bobReceived = (await usdc.balanceOf(bob.address)) - bobBefore;
    // Bob is the sole 3/5 winner, absorbs the full net (including any dust).
    expect(bobReceived).to.equal(net);

    const m = await pools.getMarket(mid);
    expect(m.tier5Pool).to.equal(0n);
    expect(m.tier4Pool).to.equal(0n);
    expect(m.tier3Pool).to.equal(net);
  });

  // ─── 7. orphan pool swept to treasury ─────────────────────

  it("test_SettleAndPayout_OrphanPoolSweptToTreasury", async function () {
    const mid = 7n;
    const locksAt = await newMarket(mid);

    // Everyone < 3/5 — entire net is orphaned.
    const resolution = 0b11111;
    await placeTicket(alice, mid, 0b00000, USDC(100)); // 0/5
    await placeTicket(bob, mid, 0b10000, USDC(100));   // 1/5
    await placeTicket(carol, mid, 0b11000, USDC(100)); // 2/5

    await time.increaseTo(locksAt);

    const grossPool = USDC(300);
    const treasuryBefore = await usdc.balanceOf(treasury.address);

    await expect(
      pools.connect(operator).settleAndPayout(mid, resolution, [], [], [])
    )
      .to.emit(pools, "OrphanPoolSwept");

    const treasuryReceived =
      (await usdc.balanceOf(treasury.address)) - treasuryBefore;
    // Treasury receives rake + orphan pool == full grossPool.
    expect(treasuryReceived).to.equal(grossPool);
    expect(await usdc.balanceOf(await pools.getAddress())).to.equal(0n);
  });

  // ─── 8. pro-rata by stake ─────────────────────────────────

  it("test_SettleAndPayout_ProRataByStake", async function () {
    const mid = 8n;
    const locksAt = await newMarket(mid);

    // Two 5/5 winners — Alice $5, Bob $15 — plus a 4/5 and a 3/5 so nothing
    // cascades out of tier 5. Tier 5 pool splits 25/75 between alice/bob.
    const resolution = 0b11111;
    await placeTicket(alice, mid, 0b11111, USDC(5));  // 5/5
    await placeTicket(bob, mid, 0b11111, USDC(15));   // 5/5
    await placeTicket(carol, mid, 0b11110, USDC(10)); // 4/5 (placeholder)
    await placeTicket(dave, mid, 0b11100, USDC(10));  // 3/5 (placeholder)

    await time.increaseTo(locksAt);

    const grossPool = USDC(40);
    const rake = (grossPool * RAKE_BPS) / BPS;
    const net = grossPool - rake;
    const tier5Pool = (net * T5_BPS) / BPS;
    const tier5Stakes = USDC(20); // alice 5 + bob 15

    const aliceBefore = await usdc.balanceOf(alice.address);
    const bobBefore = await usdc.balanceOf(bob.address);

    await pools.connect(operator).settleAndPayout(
      mid,
      resolution,
      [0, 1], // tier 5
      [2],    // tier 4
      [3]     // tier 3
    );

    const aliceReceived = (await usdc.balanceOf(alice.address)) - aliceBefore;
    const bobReceived = (await usdc.balanceOf(bob.address)) - bobBefore;

    // 25/75 split of tier 5 pool; last winner (bob) absorbs any dust.
    expect(aliceReceived + bobReceived).to.equal(tier5Pool);
    expect(aliceReceived).to.equal((tier5Pool * USDC(5)) / tier5Stakes);
    expect(bobReceived).to.equal(tier5Pool - aliceReceived);

    // Sanity: bob got ~3× alice.
    expect(bobReceived).to.be.greaterThan(aliceReceived * 2n);
  });

  // ─── 9. reverts on wrong score in array ───────────────────

  it("test_SettleAndPayout_RevertsOnWrongScoreInArray", async function () {
    const mid = 9n;
    const locksAt = await newMarket(mid);

    const resolution = 0b11111;
    await placeTicket(alice, mid, 0b11111, USDC(100)); // 5/5
    await placeTicket(bob, mid, 0b11110, USDC(100));   // 4/5 — will be mis-placed in 5/5 array

    await time.increaseTo(locksAt);

    // Bob is 4/5 but passed in the 5/5 winners list → revert.
    await expect(
      pools
        .connect(operator)
        .settleAndPayout(mid, resolution, [0, 1], [], [])
    ).to.be.revertedWith("wrong tier");
  });

  // ─── 10. reverts on duplicate ticket ─────────────────────

  it("test_SettleAndPayout_RevertsOnDuplicateTicketId", async function () {
    const mid = 10n;
    const locksAt = await newMarket(mid);

    const resolution = 0b11111;
    await placeTicket(alice, mid, 0b11111, USDC(100));

    await time.increaseTo(locksAt);

    // Same ticket listed twice in the 5/5 array.
    await expect(
      pools.connect(operator).settleAndPayout(mid, resolution, [0, 0], [], [])
    ).to.be.revertedWith("dup tid");

    // Also reverts if the same ticket appears across tier arrays — the paid
    // flag is set during the first tier's verification and the second tier
    // hits the dup-check before it gets to the score check.
    const mid2 = 1010n;
    const locks2 = await newMarket(mid2);
    await placeTicket(alice, mid2, 0b11111, USDC(100));
    await time.increaseTo(locks2);
    await expect(
      pools.connect(operator).settleAndPayout(mid2, resolution, [0], [0], [])
    ).to.be.revertedWith("dup tid");
  });

  // ─── 11. rounding dust absorbed by last winner ────────────

  it("test_SettleAndPayout_RoundingDustAbsorbedByLastWinner", async function () {
    const mid = 11n;
    const locksAt = await newMarket(mid);

    // 3 equal-stake 5/5 winners — net*0.55 divided three ways forces rounding
    // dust. Last winner absorbs the remainder so the tier pool lands exactly.
    const resolution = 0b11111;
    await placeTicket(alice, mid, 0b11111, USDC(1));  // 5/5
    await placeTicket(bob, mid, 0b11111, USDC(1));    // 5/5
    await placeTicket(carol, mid, 0b11111, USDC(1));  // 5/5
    await placeTicket(dave, mid, 0b11110, USDC(1));   // 4/5 placeholder
    await placeTicket(erin, mid, 0b11100, USDC(1));   // 3/5 placeholder

    await time.increaseTo(locksAt);

    const grossPool = USDC(5);
    const rake = (grossPool * RAKE_BPS) / BPS;
    const net = grossPool - rake;
    const tier5Pool = (net * T5_BPS) / BPS;

    const aliceBefore = await usdc.balanceOf(alice.address);
    const bobBefore = await usdc.balanceOf(bob.address);
    const carolBefore = await usdc.balanceOf(carol.address);

    await pools.connect(operator).settleAndPayout(
      mid,
      resolution,
      [0, 1, 2], // 5/5
      [3],       // 4/5
      [4]        // 3/5
    );

    const a = (await usdc.balanceOf(alice.address)) - aliceBefore;
    const b = (await usdc.balanceOf(bob.address)) - bobBefore;
    const c = (await usdc.balanceOf(carol.address)) - carolBefore;

    expect(a + b + c).to.equal(tier5Pool); // exact, dust absorbed by last winner
    expect(c).to.be.greaterThanOrEqual(a);
    expect(c).to.be.greaterThanOrEqual(b);

    // Contract holds zero after settle.
    expect(await usdc.balanceOf(await pools.getAddress())).to.equal(0n);
  });

  // ─── admin ────────────────────────────────────────────────

  describe("admin", function () {
    it("allows owner to change operator", async function () {
      await pools.setOperator(alice.address);
      expect(await pools.operator()).to.equal(alice.address);
    });

    it("allows owner to change treasury", async function () {
      await pools.setTreasury(alice.address);
      expect(await pools.treasury()).to.equal(alice.address);
    });

    it("reverts non-owner setOperator", async function () {
      await expect(
        pools.connect(alice).setOperator(alice.address)
      ).to.be.revertedWithCustomError(pools, "OwnableUnauthorizedAccount");
    });

    it("reverts non-operator createMarket", async function () {
      const locksAt = (await time.latest()) + 3600;
      await expect(
        pools.connect(alice).createMarket(99n, locksAt)
      ).to.be.revertedWith("not operator");
    });

    it("reverts on duplicate market creation", async function () {
      const mid = 100n;
      await newMarket(mid);
      const locksAt = (await time.latest()) + 3600;
      await expect(
        pools.connect(operator).createMarket(mid, locksAt)
      ).to.be.revertedWith("exists");
    });

    it("reverts createMarket with past lock time", async function () {
      const past = (await time.latest()) - 10;
      await expect(
        pools.connect(operator).createMarket(101n, past)
      ).to.be.revertedWith("past");
    });

    it("reverts settle before lock time", async function () {
      const mid = 102n;
      const locksAt = await newMarket(mid);
      await placeTicket(alice, mid, 0b11111, USDC(10));
      await expect(
        pools.connect(operator).settleAndPayout(mid, 0b11111, [0], [], [])
      ).to.be.revertedWith("too early");
      // sanity: advance and settle succeeds
      await time.increaseTo(locksAt);
      await pools.connect(operator).settleAndPayout(mid, 0b11111, [0], [], []);
    });

    it("reverts double settle", async function () {
      const mid = 103n;
      const locksAt = await newMarket(mid);
      await placeTicket(alice, mid, 0b11111, USDC(10));
      await time.increaseTo(locksAt);
      await pools.connect(operator).settleAndPayout(mid, 0b11111, [0], [], []);
      await expect(
        pools.connect(operator).settleAndPayout(mid, 0b11111, [], [], [])
      ).to.be.revertedWith("bad state");
    });
  });

  // ─── gas profile ──────────────────────────────────────────

  describe("gas profile", function () {
    it("placeTicket under 120k gas (warm)", async function () {
      const mid = 200n;
      await newMarket(mid);
      // First ticket pays for cold slot inits (gross pool, ticketCount, etc.)
      // Warm-case cost is the more meaningful number for per-user UX.
      const tx1 = await pools
        .connect(alice)
        .placeTicket(mid, 0b11111, USDC(10));
      const rec1 = await tx1.wait();
      const tx2 = await pools
        .connect(bob)
        .placeTicket(mid, 0b11111, USDC(10));
      const rec2 = await tx2.wait();
      console.log(
        `      placeTicket gas — cold: ${rec1!.gasUsed}, warm: ${rec2!.gasUsed}`
      );
      expect(rec2!.gasUsed).to.be.lessThan(120_000n);
    });

    it("settleAndPayout base under 150k gas (no winners)", async function () {
      const mid = 201n;
      const locksAt = await newMarket(mid);
      // One loser — needed so there's a market to settle.
      await placeTicket(alice, mid, 0b00000, USDC(10));
      await time.increaseTo(locksAt);
      const tx = await pools
        .connect(operator)
        .settleAndPayout(mid, 0b11111, [], [], []);
      const rec = await tx.wait();
      console.log(`      settleAndPayout base gas (no winners): ${rec!.gasUsed}`);
      expect(rec!.gasUsed).to.be.lessThan(150_000n);
    });

    it("per-winner distribution cost under 45k gas", async function () {
      const mid = 202n;
      const locksAt = await newMarket(mid);
      const N = 20;
      const ids: number[] = [];
      for (let i = 0; i < N; i++) {
        await placeTicket(
          buyers[i % buyers.length],
          mid,
          0b11111,
          USDC(1)
        );
        ids.push(i);
      }
      // One loser (so base work matches a real settle), then N winners.
      await placeTicket(alice, mid, 0b00000, USDC(1));
      await time.increaseTo(locksAt);

      const tx = await pools
        .connect(operator)
        .settleAndPayout(mid, 0b11111, ids, [], []);
      const rec = await tx.wait();
      const perWinner = rec!.gasUsed / BigInt(N);
      console.log(
        `      settle w/ ${N} winners: total ${rec!.gasUsed}, per-winner ${perWinner}`
      );
      expect(perWinner).to.be.lessThan(45_000n);
    });

    it("500 winners in a single settleAndPayout tx (under block gas)", async function () {
      const mid = 203n;
      const locksAt = await newMarket(mid);
      const N = 500;
      const ids: number[] = [];
      // All 500 tickets from alice — same picks, same tier.
      for (let i = 0; i < N; i++) {
        await pools
          .connect(alice)
          .placeTicket(mid, 0b11111, USDC(1));
        ids.push(i);
      }
      await time.increaseTo(locksAt);

      const tx = await pools
        .connect(operator)
        .settleAndPayout(mid, 0b11111, ids, [], []);
      const rec = await tx.wait();
      console.log(
        `      settle w/ 500 winners: total ${rec!.gasUsed} (${(Number(rec!.gasUsed) / 1_000_000).toFixed(2)}M gas)`
      );

      // Celo ~30M block gas; we target well under it.
      expect(rec!.gasUsed).to.be.lessThan(30_000_000n);
      expect(await usdc.balanceOf(await pools.getAddress())).to.equal(0n);
    }).timeout(600_000);
  });

  // ─── fuzz invariant ───────────────────────────────────────

  describe("fuzz invariant", function () {
    const RUNS = Number(process.env.FUZZ_RUNS ?? 100);

    it(`conservation: treasury + payouts == grossPool (${RUNS} runs)`, async function () {
      this.timeout(10 * 60 * 1000);

      for (let run = 0; run < RUNS; run++) {
        const mid = BigInt(10_000 + run);
        const locksAt = await newMarket(mid);

        const ticketCount = 10 + randInt(91); // 10..100
        const owners: string[] = [];
        const stakes: bigint[] = [];
        const picksArr: number[] = [];

        for (let i = 0; i < ticketCount; i++) {
          const buyer = buyers[randInt(buyers.length)];
          const stake = USDC(1 + randInt(1000));
          const picks = randInt(32);
          await pools.connect(buyer).placeTicket(mid, picks, stake);
          owners.push(buyer.address);
          stakes.push(stake);
          picksArr.push(picks);
        }

        const resolution = randInt(32);
        const ids5: number[] = [];
        const ids4: number[] = [];
        const ids3: number[] = [];
        for (let i = 0; i < ticketCount; i++) {
          const s = matchCount(picksArr[i], resolution);
          if (s === 5) ids5.push(i);
          else if (s === 4) ids4.push(i);
          else if (s === 3) ids3.push(i);
        }

        await time.increaseTo(locksAt);

        // Snapshot balances of unique addresses involved.
        const uniqueBuyers = Array.from(new Set(owners));
        const balBefore: Record<string, bigint> = {};
        for (const a of uniqueBuyers) {
          balBefore[a] = await usdc.balanceOf(a);
        }
        const treasuryBefore = await usdc.balanceOf(treasury.address);

        const grossPool = stakes.reduce((a, b) => a + b, 0n);
        expect((await pools.getMarket(mid)).grossPool).to.equal(grossPool);

        await pools
          .connect(operator)
          .settleAndPayout(mid, resolution, ids5, ids4, ids3);

        // Invariant 1: contract balance is zero.
        expect(await usdc.balanceOf(await pools.getAddress())).to.equal(0n);

        // Invariant 2: treasuryDelta + sum(buyerDeltas) == grossPool.
        let sumDeltas = 0n;
        for (const a of uniqueBuyers) {
          sumDeltas += (await usdc.balanceOf(a)) - balBefore[a];
        }
        const treasuryDelta =
          (await usdc.balanceOf(treasury.address)) - treasuryBefore;
        expect(treasuryDelta + sumDeltas).to.equal(grossPool);
      }
    });
  });
});
