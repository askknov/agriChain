const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FarmerRegistry", function () {
  let farmerRegistry;
  let owner, farmer1, farmer2;

  beforeEach(async function () {
    [owner, farmer1, farmer2] = await ethers.getSigners();
    const FarmerRegistry = await ethers.getContractFactory("FarmerRegistry");
    farmerRegistry = await FarmerRegistry.deploy();
    await farmerRegistry.waitForDeployment();
  });

  describe("Registration", function () {
    it("Should register a new farmer", async function () {
      await farmerRegistry
        .connect(farmer1)
        .registerFarmer("Ramesh Kumar", "Pune, Maharashtra");

      const details = await farmerRegistry.getFarmerDetails(farmer1.address);
      expect(details.name).to.equal("Ramesh Kumar");
      expect(details.location).to.equal("Pune, Maharashtra");
      expect(details.isRegistered).to.be.true;
      expect(details.isVerified).to.be.false;
    });

    it("Should not allow duplicate registration", async function () {
      await farmerRegistry
        .connect(farmer1)
        .registerFarmer("Ramesh Kumar", "Pune, Maharashtra");

      await expect(
        farmerRegistry
          .connect(farmer1)
          .registerFarmer("Ramesh Kumar", "Pune, Maharashtra")
      ).to.be.revertedWith("Farmer already registered");
    });

    it("Should not allow empty name", async function () {
      await expect(
        farmerRegistry.connect(farmer1).registerFarmer("", "Pune")
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should increment farmer count", async function () {
      await farmerRegistry
        .connect(farmer1)
        .registerFarmer("Farmer 1", "Location 1");
      await farmerRegistry
        .connect(farmer2)
        .registerFarmer("Farmer 2", "Location 2");

      expect(await farmerRegistry.farmerCount()).to.equal(2);
    });

    it("Should emit FarmerRegistered event", async function () {
      await expect(
        farmerRegistry
          .connect(farmer1)
          .registerFarmer("Ramesh Kumar", "Pune, Maharashtra")
      )
        .to.emit(farmerRegistry, "FarmerRegistered")
        .withArgs(
          farmer1.address,
          "Ramesh Kumar",
          "Pune, Maharashtra",
          (v) => v > 0 // timestamp
        );
    });
  });

  describe("Verification", function () {
    beforeEach(async function () {
      await farmerRegistry
        .connect(farmer1)
        .registerFarmer("Ramesh Kumar", "Pune, Maharashtra");
    });

    it("Should allow owner to verify a farmer", async function () {
      await farmerRegistry.connect(owner).verifyFarmer(farmer1.address);
      expect(await farmerRegistry.isVerified(farmer1.address)).to.be.true;
    });

    it("Should not allow non-owner to verify", async function () {
      await expect(
        farmerRegistry.connect(farmer2).verifyFarmer(farmer1.address)
      ).to.be.reverted;
    });

    it("Should not verify unregistered farmer", async function () {
      await expect(
        farmerRegistry.connect(owner).verifyFarmer(farmer2.address)
      ).to.be.revertedWith("Farmer not registered");
    });
  });

  describe("View Functions", function () {
    it("Should return all farmer addresses", async function () {
      await farmerRegistry
        .connect(farmer1)
        .registerFarmer("Farmer 1", "Location 1");
      await farmerRegistry
        .connect(farmer2)
        .registerFarmer("Farmer 2", "Location 2");

      const allFarmers = await farmerRegistry.getAllFarmers();
      expect(allFarmers.length).to.equal(2);
      expect(allFarmers[0]).to.equal(farmer1.address);
      expect(allFarmers[1]).to.equal(farmer2.address);
    });
  });
});
