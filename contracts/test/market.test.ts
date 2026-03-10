import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("zkPredictionMarket", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await hre.ethers.getSigners();

    const Verifier = await hre.ethers.getContractFactory("SettlementVerifier");
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    const Market = await hre.ethers.getContractFactory("zkPredictionMarket");
    const market = await Market.deploy(await verifier.getAddress());
    await market.waitForDeployment();

    return { market, verifier, owner, alice, bob };
  }

  describe("Market Creation", function () {
    it("should create a market", async function () {
      const { market } = await deployFixture();
      const futureTime = (await time.latest()) + 7 * 24 * 60 * 60;
      await market.createMarket("Will ETH > $3000?", futureTime);

      const m = await market.getMarket(1);
      expect(m.question).to.equal("Will ETH > $3000?");
      expect(m.resolved).to.be.false;
      expect(m.outcome).to.equal(0n);
    });

    it("should reject past resolution time", async function () {
      const { market } = await deployFixture();
      const pastTime = (await time.latest()) - 100;
      await expect(
        market.createMarket("Test?", pastTime)
      ).to.be.revertedWith("Resolution time must be in future");
    });

    it("should increment market count", async function () {
      const { market } = await deployFixture();
      const futureTime = (await time.latest()) + 86400;
      await market.createMarket("Q1?", futureTime);
      await market.createMarket("Q2?", futureTime);
      expect(await market.marketCount()).to.equal(2n);
    });
  });

  describe("Commit Prediction", function () {
    it("should commit a prediction", async function () {
      const { market, alice } = await deployFixture();
      const futureTime = (await time.latest()) + 86400;
      await market.createMarket("Test?", futureTime);

      const commitment = 12345n;
      await market
        .connect(alice)
        .commitPrediction(1, commitment, true, { value: hre.ethers.parseEther("0.1") });

      const pred = await market.getUserPrediction(1, alice.address);
      expect(pred.commitment).to.equal(commitment);
      expect(pred.amount).to.equal(hre.ethers.parseEther("0.1"));
      expect(pred.side).to.be.true;
      expect(pred.revealed).to.be.false;
    });

    it("should reject double commit", async function () {
      const { market, alice } = await deployFixture();
      const futureTime = (await time.latest()) + 86400;
      await market.createMarket("Test?", futureTime);

      await market
        .connect(alice)
        .commitPrediction(1, 111n, true, { value: hre.ethers.parseEther("0.1") });

      await expect(
        market.connect(alice).commitPrediction(1, 222n, false, { value: hre.ethers.parseEther("0.1") })
      ).to.be.revertedWith("Already committed");
    });

    it("should reject zero bet", async function () {
      const { market, alice } = await deployFixture();
      const futureTime = (await time.latest()) + 86400;
      await market.createMarket("Test?", futureTime);

      await expect(
        market.connect(alice).commitPrediction(1, 111n, true, { value: 0 })
      ).to.be.revertedWith("Must bet some amount");
    });

    it("should track pool totals", async function () {
      const { market, alice, bob } = await deployFixture();
      const futureTime = (await time.latest()) + 86400;
      await market.createMarket("Test?", futureTime);

      await market.connect(alice).commitPrediction(1, 1n, true, { value: hre.ethers.parseEther("1") });
      await market.connect(bob).commitPrediction(1, 2n, false, { value: hre.ethers.parseEther("2") });

      const stats = await market.getMarketStats(1);
      expect(stats.totalYes).to.equal(hre.ethers.parseEther("1"));
      expect(stats.totalNo).to.equal(hre.ethers.parseEther("2"));
      expect(stats.totalPool).to.equal(hre.ethers.parseEther("3"));
    });
  });

  describe("Market Resolution", function () {
    it("should resolve a market after resolution time", async function () {
      const { market } = await deployFixture();
      const futureTime = (await time.latest()) + 86400;
      await market.createMarket("Test?", futureTime);

      await time.increase(86401);
      await market.resolveMarket(1, 1); // YES

      const m = await market.getMarket(1);
      expect(m.resolved).to.be.true;
      expect(m.outcome).to.equal(1n);
    });

    it("should reject non-owner resolution", async function () {
      const { market, alice } = await deployFixture();
      const futureTime = (await time.latest()) + 86400;
      await market.createMarket("Test?", futureTime);

      await time.increase(86401);
      await expect(
        market.connect(alice).resolveMarket(1, 1)
      ).to.be.revertedWith("Only owner can resolve");
    });

    it("should reject early resolution", async function () {
      const { market } = await deployFixture();
      const futureTime = (await time.latest()) + 86400;
      await market.createMarket("Test?", futureTime);

      await expect(
        market.resolveMarket(1, 1)
      ).to.be.revertedWith("Market not ended yet");
    });

    it("should reject invalid outcome", async function () {
      const { market } = await deployFixture();
      const futureTime = (await time.latest()) + 86400;
      await market.createMarket("Test?", futureTime);

      await time.increase(86401);
      await expect(
        market.resolveMarket(1, 0)
      ).to.be.revertedWith("Outcome must be 1 (YES) or 2 (NO)");
    });
  });

  describe("Reveal & Claim (ZK proof)", function () {
    it("should reject reveal on unresolved market", async function () {
      const { market, alice } = await deployFixture();
      const futureTime = (await time.latest()) + 86400;
      await market.createMarket("Test?", futureTime);

      await market
        .connect(alice)
        .commitPrediction(1, 111n, true, { value: hre.ethers.parseEther("0.1") });

      const dummyProof = {
        pA: [0n, 0n] as [bigint, bigint],
        pB: [[0n, 0n], [0n, 0n]] as [[bigint, bigint], [bigint, bigint]],
        pC: [0n, 0n] as [bigint, bigint],
        pubSignals: [0n, 0n, 0n, 0n] as [bigint, bigint, bigint, bigint],
      };

      await expect(
        market.connect(alice).revealAndClaim(
          1, dummyProof.pA, dummyProof.pB, dummyProof.pC, dummyProof.pubSignals
        )
      ).to.be.revertedWith("Market not resolved");
    });

    it("should reject reveal with no commitment", async function () {
      const { market, alice } = await deployFixture();
      const futureTime = (await time.latest()) + 86400;
      await market.createMarket("Test?", futureTime);

      await time.increase(86401);
      await market.resolveMarket(1, 1);

      const dummyProof = {
        pA: [0n, 0n] as [bigint, bigint],
        pB: [[0n, 0n], [0n, 0n]] as [[bigint, bigint], [bigint, bigint]],
        pC: [0n, 0n] as [bigint, bigint],
        pubSignals: [0n, 0n, 0n, 0n] as [bigint, bigint, bigint, bigint],
      };

      await expect(
        market.connect(alice).revealAndClaim(
          1, dummyProof.pA, dummyProof.pB, dummyProof.pC, dummyProof.pubSignals
        )
      ).to.be.revertedWith("No commitment");
    });
  });

  describe("Market Stats", function () {
    it("should return 50/50 odds for empty market", async function () {
      const { market } = await deployFixture();
      const futureTime = (await time.latest()) + 86400;
      await market.createMarket("Test?", futureTime);

      const stats = await market.getMarketStats(1);
      expect(stats.yesOdds).to.equal(5000n);
      expect(stats.noOdds).to.equal(5000n);
    });

    it("should calculate correct odds", async function () {
      const { market, alice, bob } = await deployFixture();
      const futureTime = (await time.latest()) + 86400;
      await market.createMarket("Test?", futureTime);

      await market.connect(alice).commitPrediction(1, 1n, true, { value: hre.ethers.parseEther("3") });
      await market.connect(bob).commitPrediction(1, 2n, false, { value: hre.ethers.parseEther("1") });

      const stats = await market.getMarketStats(1);
      expect(stats.yesOdds).to.equal(7500n); // 75%
      expect(stats.noOdds).to.equal(2500n); // 25%
    });
  });
});
