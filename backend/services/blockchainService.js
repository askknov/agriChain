/**
 * @file blockchainService.js
 * @description Server-side blockchain interaction service.
 *              Used by the backend to write ML predictions to the blockchain.
 */

const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

let provider, signer, contracts;

/**
 * Initialize blockchain connection and contract instances
 */
function initBlockchain() {
  try {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
    provider = new ethers.JsonRpcProvider(rpcUrl);

    // Server wallet for signing transactions (e.g., storing ML predictions)
    if (process.env.SERVER_PRIVATE_KEY) {
      signer = new ethers.Wallet(process.env.SERVER_PRIVATE_KEY, provider);
    }

    // Load deployed addresses
    const addressesPath = path.join(
      __dirname,
      "..",
      "utils",
      "deployedAddresses.json"
    );

    if (!fs.existsSync(addressesPath)) {
      console.log(
        "⚠️  deployedAddresses.json not found. Blockchain features disabled."
      );
      console.log(
        "   Run the deployment script first, then restart the backend."
      );
      return false;
    }

    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

    // Load ABIs from the blockchain project's artifacts
    const artifactsBase = path.join(
      __dirname,
      "..",
      "..",
      "blockchain",
      "artifacts",
      "contracts"
    );

    const loadABI = (contractName) => {
      const abiPath = path.join(
        artifactsBase,
        `${contractName}.sol`,
        `${contractName}.json`
      );
      if (fs.existsSync(abiPath)) {
        return JSON.parse(fs.readFileSync(abiPath, "utf-8")).abi;
      }
      console.log(`⚠️  ABI not found for ${contractName}`);
      return null;
    };

    const farmerRegistryABI = loadABI("FarmerRegistry");
    const cropRegistryABI = loadABI("CropRegistry");
    const mlPredictionStoreABI = loadABI("MLPredictionStore");
    const supplyChainABI = loadABI("SupplyChain");

    contracts = {};

    if (farmerRegistryABI) {
      contracts.farmerRegistry = new ethers.Contract(
        addresses.contracts.FarmerRegistry,
        farmerRegistryABI,
        signer || provider
      );
    }

    if (cropRegistryABI) {
      contracts.cropRegistry = new ethers.Contract(
        addresses.contracts.CropRegistry,
        cropRegistryABI,
        signer || provider
      );
    }

    if (mlPredictionStoreABI) {
      contracts.mlPredictionStore = new ethers.Contract(
        addresses.contracts.MLPredictionStore,
        mlPredictionStoreABI,
        signer || provider
      );
    }

    if (supplyChainABI) {
      contracts.supplyChain = new ethers.Contract(
        addresses.contracts.SupplyChain,
        supplyChainABI,
        signer || provider
      );
    }

    console.log("✅ Blockchain service initialized");
    return true;
  } catch (error) {
    console.error("❌ Blockchain init error:", error.message);
    return false;
  }
}

/**
 * Store an ML prediction hash on the blockchain
 * @param {number} cropId - On-chain crop ID
 * @param {number} predType - Prediction type enum (0-4)
 * @param {string} resultJson - Full prediction result as JSON string
 * @param {number} confidence - Confidence score (0-100)
 * @returns {Object} { txHash, predictionId, resultHash }
 */
async function storePredictionOnChain(cropId, predType, resultJson, confidence) {
  if (!contracts?.mlPredictionStore) {
    throw new Error("MLPredictionStore contract not initialized");
  }
  if (!signer) {
    throw new Error("Server wallet not configured (SERVER_PRIVATE_KEY)");
  }

  // Compute keccak256 hash of the prediction data
  const resultHash = ethers.keccak256(ethers.toUtf8Bytes(resultJson));

  // Send the transaction
  const tx = await contracts.mlPredictionStore.storePrediction(
    cropId,
    predType,
    resultHash,
    confidence
  );

  const receipt = await tx.wait();

  // Parse the PredictionStored event to get the prediction ID
  const event = receipt.logs
    .map((log) => {
      try {
        return contracts.mlPredictionStore.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "PredictionStored");

  const predictionId = event ? Number(event.args.predictionId) : null;

  return {
    txHash: receipt.hash,
    predictionId,
    resultHash,
  };
}

/**
 * Verify a prediction against its on-chain hash
 */
async function verifyPrediction(predictionId, rawData) {
  if (!contracts?.mlPredictionStore) {
    throw new Error("MLPredictionStore contract not initialized");
  }
  return contracts.mlPredictionStore.verifyPrediction(predictionId, rawData);
}

/**
 * Get contract instances for direct use in routes
 */
function getContracts() {
  return contracts;
}

function getProvider() {
  return provider;
}

function getSigner() {
  return signer;
}

module.exports = {
  initBlockchain,
  storePredictionOnChain,
  verifyPrediction,
  getContracts,
  getProvider,
  getSigner,
};
