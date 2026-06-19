const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChain", function () {
  let farmerRegistry, cropRegistry, supplyChain;
  let owner, farmer, processor, distributor, retailer;

  beforeEach(async function () {
    [owner, farmer, processor, distributor, retailer] =
      await ethers.getSigners();

    // Deploy FarmerRegistry
    const FarmerRegistry = await ethers.getContractFactory("FarmerRegistry");
    farmerRegistry = await FarmerRegistry.deploy();
    await farmerRegistry.waitForDeployment();

    // Deploy CropRegistry
    const CropRegistry = await ethers.getContractFactory("CropRegistry");
    cropRegistry = await CropRegistry.deploy(
      await farmerRegistry.getAddress()
    );
    await cropRegistry.waitForDeployment();

    // Deploy SupplyChain
    const SupplyChainContract = await ethers.getContractFactory("SupplyChain");
    supplyChain = await SupplyChainContract.deploy(
      await cropRegistry.getAddress()
    );
    await supplyChain.waitForDeployment();

    // Setup: Register farmer and crop
    await farmerRegistry
      .connect(farmer)
      .registerFarmer("Ramesh Kumar", "Pune");
    await cropRegistry
      .connect(farmer)
      .registerCrop("Wheat", Math.floor(Date.now() / 1000), "Field A");
  });

  describe("Batch Creation", function () {
    it("Should create a new batch", async function () {
      await supplyChain
        .connect(farmer)
        .createBatch(1, 500, "kg", "Ramesh Kumar");

      const batch = await supplyChain.getBatchDetails(1);
      expect(batch.cropId).to.equal(1);
      expect(batch.quantity).to.equal(500);
      expect(batch.unit).to.equal("kg");
      expect(batch.currentHandler).to.equal(farmer.address);
      expect(batch.currentHandlerRole).to.equal("Farmer");
      expect(batch.status).to.equal(0); // Created
    });

    it("Should emit BatchCreated event", async function () {
      await expect(
        supplyChain.connect(farmer).createBatch(1, 500, "kg", "Ramesh Kumar")
      )
        .to.emit(supplyChain, "BatchCreated")
        .withArgs(1, 1, farmer.address, 500, "kg", (v) => v > 0);
    });
  });

  describe("Batch Transfers", function () {
    beforeEach(async function () {
      await supplyChain
        .connect(farmer)
        .createBatch(1, 500, "kg", "Ramesh Kumar");
    });

    it("Should transfer batch to processor", async function () {
      await supplyChain
        .connect(farmer)
        .transferBatch(
          1,
          processor.address,
          "AgriFoods Ltd",
          "Processor",
          1, // Processing
          "Sent for wheat flour processing"
        );

      const batch = await supplyChain.getBatchDetails(1);
      expect(batch.currentHandler).to.equal(processor.address);
      expect(batch.currentHandlerRole).to.equal("Processor");
      expect(batch.status).to.equal(1); // Processing
    });

    it("Should track full supply chain journey", async function () {
      // Farmer → Processor
      await supplyChain
        .connect(farmer)
        .transferBatch(
          1,
          processor.address,
          "AgriFoods Ltd",
          "Processor",
          1,
          "Sent for processing"
        );

      // Processor → Distributor
      await supplyChain
        .connect(processor)
        .transferBatch(
          1,
          distributor.address,
          "FreshDist Inc",
          "Distributor",
          3, // InTransit
          "Processed and dispatched"
        );

      // Distributor → Retailer
      await supplyChain
        .connect(distributor)
        .transferBatch(
          1,
          retailer.address,
          "SuperMart",
          "Retailer",
          5, // AtRetailer
          "Delivered to store"
        );

      // Check final state
      const batch = await supplyChain.getBatchDetails(1);
      expect(batch.currentHandler).to.equal(retailer.address);
      expect(batch.transferCount).to.equal(3);

      // Check full history
      const history = await supplyChain.getBatchHistory(1);
      expect(history.length).to.equal(3);
      expect(history[0].fromRole).to.equal("Farmer");
      expect(history[0].toRole).to.equal("Processor");
      expect(history[2].toRole).to.equal("Retailer");
    });

    it("Should not allow non-handler to transfer", async function () {
      await expect(
        supplyChain
          .connect(processor)
          .transferBatch(
            1,
            distributor.address,
            "Dist",
            "Distributor",
            3,
            "Steal attempt"
          )
      ).to.be.revertedWith("Not the current handler");
    });
  });
});
