const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CropRegistry", function () {
  let farmerRegistry, cropRegistry;
  let owner, farmer1, nonFarmer;

  beforeEach(async function () {
    [owner, farmer1, nonFarmer] = await ethers.getSigners();

    // Deploy FarmerRegistry first
    const FarmerRegistry = await ethers.getContractFactory("FarmerRegistry");
    farmerRegistry = await FarmerRegistry.deploy();
    await farmerRegistry.waitForDeployment();

    // Deploy CropRegistry with FarmerRegistry address
    const CropRegistry = await ethers.getContractFactory("CropRegistry");
    cropRegistry = await CropRegistry.deploy(
      await farmerRegistry.getAddress()
    );
    await cropRegistry.waitForDeployment();

    // Register farmer1
    await farmerRegistry
      .connect(farmer1)
      .registerFarmer("Ramesh Kumar", "Pune, Maharashtra");
  });

  describe("Crop Registration", function () {
    it("Should register a crop by a registered farmer", async function () {
      const plantingDate = Math.floor(Date.now() / 1000);

      await cropRegistry
        .connect(farmer1)
        .registerCrop("Wheat", plantingDate, "Field A, Pune");

      const crop = await cropRegistry.getCropDetails(1);
      expect(crop.cropType).to.equal("Wheat");
      expect(crop.farmer).to.equal(farmer1.address);
      expect(crop.status).to.equal(0); // Planted
    });

    it("Should not allow non-registered user to register crops", async function () {
      await expect(
        cropRegistry
          .connect(nonFarmer)
          .registerCrop("Rice", Math.floor(Date.now() / 1000), "Field B")
      ).to.be.revertedWith("Not a registered farmer");
    });

    it("Should emit CropRegistered event", async function () {
      const plantingDate = Math.floor(Date.now() / 1000);

      await expect(
        cropRegistry
          .connect(farmer1)
          .registerCrop("Rice", plantingDate, "Field C")
      )
        .to.emit(cropRegistry, "CropRegistered")
        .withArgs(1, farmer1.address, "Rice", "Field C", plantingDate, (v) => v > 0);
    });

    it("Should increment crop count", async function () {
      await cropRegistry
        .connect(farmer1)
        .registerCrop("Wheat", Math.floor(Date.now() / 1000), "Field A");
      await cropRegistry
        .connect(farmer1)
        .registerCrop("Rice", Math.floor(Date.now() / 1000), "Field B");

      expect(await cropRegistry.cropCount()).to.equal(2);
    });
  });

  describe("Status Updates", function () {
    beforeEach(async function () {
      await cropRegistry
        .connect(farmer1)
        .registerCrop("Wheat", Math.floor(Date.now() / 1000), "Field A");
    });

    it("Should update crop status forward", async function () {
      await cropRegistry.connect(farmer1).updateCropStatus(1, 1); // Growing
      const crop = await cropRegistry.getCropDetails(1);
      expect(crop.status).to.equal(1);
    });

    it("Should not allow backward status change", async function () {
      await cropRegistry.connect(farmer1).updateCropStatus(1, 2); // ReadyForHarvest
      await expect(
        cropRegistry.connect(farmer1).updateCropStatus(1, 1) // Growing (backward)
      ).to.be.revertedWith("Status can only move forward");
    });

    it("Should not allow non-owner to update status", async function () {
      await expect(
        cropRegistry.connect(nonFarmer).updateCropStatus(1, 1)
      ).to.be.revertedWith("Not the crop owner");
    });
  });

  describe("View Functions", function () {
    it("Should return crops by farmer", async function () {
      await cropRegistry
        .connect(farmer1)
        .registerCrop("Wheat", Math.floor(Date.now() / 1000), "Field A");
      await cropRegistry
        .connect(farmer1)
        .registerCrop("Rice", Math.floor(Date.now() / 1000), "Field B");

      const crops = await cropRegistry.getCropsByFarmer(farmer1.address);
      expect(crops.length).to.equal(2);
    });
  });
});
