/**
 * @file deploy.js
 * @description Deploys all AgriChain smart contracts in the correct order.
 *
 * Deployment order matters because contracts reference each other:
 * 1. FarmerRegistry (no dependencies)
 * 2. CropRegistry (depends on FarmerRegistry address)
 * 3. MLPredictionStore (no dependencies, but logically linked)
 * 4. SupplyChain (depends on CropRegistry address)
 *
 * Usage:
 *   Local:   npx hardhat run scripts/deploy.js
 *   Sepolia: npx hardhat run scripts/deploy.js --network sepolia
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("=".repeat(60));
  console.log("  AgriChain Smart Contract Deployment");
  console.log("=".repeat(60));
  console.log(`Deployer address: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log("-".repeat(60));

  // ── 1. Deploy FarmerRegistry ──────────────────────────────────
  console.log("\n[1/4] Deploying FarmerRegistry...");
  const FarmerRegistry = await hre.ethers.getContractFactory("FarmerRegistry");
  const farmerRegistry = await FarmerRegistry.deploy();
  await farmerRegistry.waitForDeployment();
  const farmerRegistryAddress = await farmerRegistry.getAddress();
  console.log(`  ✅ FarmerRegistry deployed at: ${farmerRegistryAddress}`);

  // ── 2. Deploy CropRegistry ────────────────────────────────────
  console.log("\n[2/4] Deploying CropRegistry...");
  const CropRegistry = await hre.ethers.getContractFactory("CropRegistry");
  const cropRegistry = await CropRegistry.deploy(farmerRegistryAddress);
  await cropRegistry.waitForDeployment();
  const cropRegistryAddress = await cropRegistry.getAddress();
  console.log(`  ✅ CropRegistry deployed at: ${cropRegistryAddress}`);

  // ── 3. Deploy MLPredictionStore ───────────────────────────────
  console.log("\n[3/4] Deploying MLPredictionStore...");
  const MLPredictionStore = await hre.ethers.getContractFactory("MLPredictionStore");
  const mlPredictionStore = await MLPredictionStore.deploy();
  await mlPredictionStore.waitForDeployment();
  const mlPredictionStoreAddress = await mlPredictionStore.getAddress();
  console.log(`  ✅ MLPredictionStore deployed at: ${mlPredictionStoreAddress}`);

  // ── 4. Deploy SupplyChain ─────────────────────────────────────
  console.log("\n[4/4] Deploying SupplyChain...");
  const SupplyChainContract = await hre.ethers.getContractFactory("SupplyChain");
  const supplyChain = await SupplyChainContract.deploy(cropRegistryAddress);
  await supplyChain.waitForDeployment();
  const supplyChainAddress = await supplyChain.getAddress();
  console.log(`  ✅ SupplyChain deployed at: ${supplyChainAddress}`);

  // ── Save deployed addresses ───────────────────────────────────
  console.log("\n" + "-".repeat(60));
  console.log("Saving deployed addresses...");

  const deployedAddresses = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      FarmerRegistry: farmerRegistryAddress,
      CropRegistry: cropRegistryAddress,
      MLPredictionStore: mlPredictionStoreAddress,
      SupplyChain: supplyChainAddress,
    },
  };

  // Save to blockchain/deployedAddresses.json
  const outputPath = path.join(__dirname, "..", "deployedAddresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(deployedAddresses, null, 2));
  console.log(`  📄 Addresses saved to: ${outputPath}`);

  // Also save to frontend utils (if frontend exists)
  const frontendPath = path.join(
    __dirname,
    "..",
    "..",
    "frontend",
    "src",
    "utils"
  );
  if (fs.existsSync(frontendPath)) {
    fs.writeFileSync(
      path.join(frontendPath, "deployedAddresses.json"),
      JSON.stringify(deployedAddresses, null, 2)
    );
    console.log("  📄 Addresses also copied to frontend/src/utils/");
  }

  // Also save to backend utils (if backend exists)
  const backendPath = path.join(__dirname, "..", "..", "backend", "utils");
  if (fs.existsSync(backendPath)) {
    fs.writeFileSync(
      path.join(backendPath, "deployedAddresses.json"),
      JSON.stringify(deployedAddresses, null, 2)
    );
    console.log("  📄 Addresses also copied to backend/utils/");
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("  DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log(`  FarmerRegistry:    ${farmerRegistryAddress}`);
  console.log(`  CropRegistry:      ${cropRegistryAddress}`);
  console.log(`  MLPredictionStore: ${mlPredictionStoreAddress}`);
  console.log(`  SupplyChain:       ${supplyChainAddress}`);
  console.log(`\nNetwork: ${hre.network.name}`);
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
