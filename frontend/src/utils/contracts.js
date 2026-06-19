/**
 * Contract utility — loads ABIs and deployed addresses.
 * After deploying contracts, the deploy script copies deployedAddresses.json here.
 * ABIs are loaded from the blockchain project artifacts.
 */

// Default addresses (updated after deployment)
let deployedAddresses = {
  contracts: {
    FarmerRegistry: "",
    CropRegistry: "",
    MLPredictionStore: "",
    SupplyChain: "",
  },
};

// Try to load deployed addresses
try {
  deployedAddresses = await import("./deployedAddresses.json");
} catch {
  console.log("No deployed addresses found. Deploy contracts first.");
}

// ── ABIs (minimal — only the functions we need) ─────────────

export const FARMER_REGISTRY_ABI = [
  "function registerFarmer(string calldata _name, string calldata _location) external",
  "function verifyFarmer(address _farmer) external",
  "function getFarmerDetails(address _farmer) external view returns (string name, string location, uint256 registeredAt, bool isRegistered, bool isVerified)",
  "function isRegistered(address _farmer) external view returns (bool)",
  "function isVerified(address _farmer) external view returns (bool)",
  "function getAllFarmers() external view returns (address[])",
  "function farmerCount() external view returns (uint256)",
  "event FarmerRegistered(address indexed farmerAddress, string name, string location, uint256 timestamp)",
  "event FarmerVerified(address indexed farmerAddress, uint256 timestamp)",
];

export const CROP_REGISTRY_ABI = [
  "function registerCrop(string calldata _cropType, uint256 _plantingDate, string calldata _location) external",
  "function updateCropStatus(uint256 _cropId, uint8 _newStatus) external",
  "function getCropDetails(uint256 _cropId) external view returns (tuple(uint256 id, address farmer, string cropType, string location, uint256 plantingDate, uint8 status, uint256 createdAt, uint256 updatedAt, bool exists))",
  "function getCropsByFarmer(address _farmer) external view returns (uint256[])",
  "function cropCount() external view returns (uint256)",
  "event CropRegistered(uint256 indexed cropId, address indexed farmer, string cropType, string location, uint256 plantingDate, uint256 timestamp)",
  "event CropStatusUpdated(uint256 indexed cropId, uint8 oldStatus, uint8 newStatus, uint256 timestamp)",
];

export const ML_PREDICTION_STORE_ABI = [
  "function storePrediction(uint256 _cropId, uint8 _predType, bytes32 _resultHash, uint8 _confidence) external",
  "function getPrediction(uint256 _predId) external view returns (tuple(uint256 id, uint256 cropId, uint8 predType, bytes32 resultHash, uint8 confidence, address submittedBy, uint256 timestamp, bool exists))",
  "function getPredictionsByCrop(uint256 _cropId) external view returns (uint256[])",
  "function verifyPrediction(uint256 _predId, string calldata _rawData) external view returns (bool)",
  "function predictionCount() external view returns (uint256)",
  "event PredictionStored(uint256 indexed predictionId, uint256 indexed cropId, uint8 predType, bytes32 resultHash, uint8 confidence, address submittedBy, uint256 timestamp)",
];

export const SUPPLY_CHAIN_ABI = [
  "function createBatch(uint256 _cropId, uint256 _quantity, string calldata _unit, string calldata _farmerName) external",
  "function transferBatch(uint256 _batchId, address _to, string calldata _toName, string calldata _toRole, uint8 _newStatus, string calldata _notes) external",
  "function updateBatchStatus(uint256 _batchId, uint8 _newStatus) external",
  "function getBatchDetails(uint256 _batchId) external view returns (tuple(uint256 id, uint256 cropId, address currentHandler, string currentHandlerName, string currentHandlerRole, uint256 quantity, string unit, uint8 status, uint256 createdAt, uint256 updatedAt, uint256 transferCount, bool exists))",
  "function getBatchHistory(uint256 _batchId) external view returns (tuple(address from, address to, string fromName, string toName, string fromRole, string toRole, uint256 timestamp, string notes)[])",
  "function getBatchesByHandler(address _handler) external view returns (uint256[])",
  "function batchCount() external view returns (uint256)",
  "event BatchCreated(uint256 indexed batchId, uint256 indexed cropId, address indexed farmer, uint256 quantity, string unit, uint256 timestamp)",
  "event BatchTransferred(uint256 indexed batchId, address indexed from, address indexed to, string fromRole, string toRole, uint256 timestamp)",
];

export const CONTRACT_ADDRESSES = deployedAddresses.contracts || {
  FarmerRegistry: "",
  CropRegistry: "",
  MLPredictionStore: "",
  SupplyChain: "",
};

// Crop status labels
export const CROP_STATUS = [
  "Planted",
  "Growing",
  "ReadyForHarvest",
  "Harvested",
  "InTransit",
  "Delivered",
];

// Batch status labels
export const BATCH_STATUS = [
  "Created",
  "Processing",
  "Processed",
  "InTransit",
  "Delivered",
  "AtRetailer",
  "Sold",
];

// Prediction type labels
export const PREDICTION_TYPES = [
  "CropHealth",
  "DiseaseRisk",
  "YieldPrediction",
  "MarketPrice",
  "Recommendation",
];
