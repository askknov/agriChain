const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MLPredictionStore", function () {
  let mlStore;
  let owner, oracle, nonOracle;

  beforeEach(async function () {
    [owner, oracle, nonOracle] = await ethers.getSigners();

    const MLPredictionStore = await ethers.getContractFactory("MLPredictionStore");
    mlStore = await MLPredictionStore.deploy();
    await mlStore.waitForDeployment();

    // Authorize oracle
    await mlStore.connect(owner).authorizeOracle(oracle.address);
  });

  describe("Oracle Management", function () {
    it("Should authorize oracle", async function () {
      expect(await mlStore.authorizedOracles(oracle.address)).to.be.true;
    });

    it("Should revoke oracle", async function () {
      await mlStore.connect(owner).revokeOracle(oracle.address);
      expect(await mlStore.authorizedOracles(oracle.address)).to.be.false;
    });

    it("Owner should be auto-authorized", async function () {
      expect(await mlStore.authorizedOracles(owner.address)).to.be.true;
    });
  });

  describe("Store Predictions", function () {
    it("Should store a prediction from authorized oracle", async function () {
      const resultHash = ethers.keccak256(
        ethers.toUtf8Bytes('{"health":"good","score":85}')
      );

      await mlStore
        .connect(oracle)
        .storePrediction(1, 0, resultHash, 85); // CropHealth, 85% confidence

      const pred = await mlStore.getPrediction(1);
      expect(pred.cropId).to.equal(1);
      expect(pred.predType).to.equal(0); // CropHealth
      expect(pred.confidence).to.equal(85);
      expect(pred.resultHash).to.equal(resultHash);
    });

    it("Should not allow unauthorized address to store", async function () {
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await expect(
        mlStore.connect(nonOracle).storePrediction(1, 0, resultHash, 85)
      ).to.be.revertedWith("Not an authorized oracle");
    });

    it("Should not allow confidence > 100", async function () {
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await expect(
        mlStore.connect(oracle).storePrediction(1, 0, resultHash, 101)
      ).to.be.revertedWith("Confidence must be 0-100");
    });
  });

  describe("Verification", function () {
    it("Should verify a prediction with correct data", async function () {
      const rawData = '{"health":"good","score":85}';
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes(rawData));

      await mlStore.connect(oracle).storePrediction(1, 0, resultHash, 85);

      // Verify with the same raw data
      expect(await mlStore.verifyPrediction(1, rawData)).to.be.true;
    });

    it("Should fail verification with wrong data", async function () {
      const rawData = '{"health":"good","score":85}';
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes(rawData));

      await mlStore.connect(oracle).storePrediction(1, 0, resultHash, 85);

      // Verify with tampered data
      expect(
        await mlStore.verifyPrediction(1, '{"health":"bad","score":20}')
      ).to.be.false;
    });
  });

  describe("Query Predictions", function () {
    it("Should get predictions by crop", async function () {
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("pred1"));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("pred2"));

      await mlStore.connect(oracle).storePrediction(1, 0, hash1, 90); // CropHealth
      await mlStore.connect(oracle).storePrediction(1, 1, hash2, 75); // DiseaseRisk

      const preds = await mlStore.getPredictionsByCrop(1);
      expect(preds.length).to.equal(2);
    });
  });
});
