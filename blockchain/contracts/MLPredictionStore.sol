// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MLPredictionStore
 * @author AgriChain Project
 * @notice Stores ML prediction result hashes on-chain for tamper-proof verification.
 * @dev The full prediction data lives off-chain (MongoDB). Only the keccak256 hash
 *      of the prediction JSON is stored here, along with metadata. Anyone can
 *      verify a prediction by hashing the off-chain data and comparing.
 *
 *      The "oracle" role is the backend server that calls the ML service and
 *      writes results to this contract.
 */
contract MLPredictionStore is Ownable {
    // ============================================================
    //                        DATA STRUCTURES
    // ============================================================

    enum PredictionType {
        CropHealth,
        DiseaseRisk,
        YieldPrediction,
        MarketPrice,
        Recommendation
    }

    struct Prediction {
        uint256 id;
        uint256 cropId;
        PredictionType predType;
        bytes32 resultHash; // keccak256 hash of the full prediction JSON
        uint8 confidence; // 0-100 confidence score
        address submittedBy; // oracle/backend address
        uint256 timestamp;
        bool exists;
    }

    // ============================================================
    //                        STATE VARIABLES
    // ============================================================

    /// @notice Auto-incrementing prediction ID counter
    uint256 public predictionCount;

    /// @notice Maps prediction ID to Prediction struct
    mapping(uint256 => Prediction) public predictions;

    /// @notice Maps crop ID to its prediction IDs
    mapping(uint256 => uint256[]) public cropPredictions;

    /// @notice Authorized oracle addresses that can submit predictions
    mapping(address => bool) public authorizedOracles;

    // ============================================================
    //                           EVENTS
    // ============================================================

    event PredictionStored(
        uint256 indexed predictionId,
        uint256 indexed cropId,
        PredictionType predType,
        bytes32 resultHash,
        uint8 confidence,
        address submittedBy,
        uint256 timestamp
    );

    event OracleAuthorized(address indexed oracle, uint256 timestamp);
    event OracleRevoked(address indexed oracle, uint256 timestamp);

    // ============================================================
    //                          MODIFIERS
    // ============================================================

    modifier onlyOracle() {
        require(
            authorizedOracles[msg.sender] || msg.sender == owner(),
            "Not an authorized oracle"
        );
        _;
    }

    // ============================================================
    //                        CONSTRUCTOR
    // ============================================================

    constructor() Ownable(msg.sender) {
        // The deployer (admin) is automatically an authorized oracle
        authorizedOracles[msg.sender] = true;
    }

    // ============================================================
    //                    ADMIN FUNCTIONS
    // ============================================================

    /**
     * @notice Authorize a new oracle address (e.g., backend server wallet)
     * @param _oracle Address to authorize
     */
    function authorizeOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid address");
        authorizedOracles[_oracle] = true;
        emit OracleAuthorized(_oracle, block.timestamp);
    }

    /**
     * @notice Revoke oracle authorization
     * @param _oracle Address to revoke
     */
    function revokeOracle(address _oracle) external onlyOwner {
        authorizedOracles[_oracle] = false;
        emit OracleRevoked(_oracle, block.timestamp);
    }

    // ============================================================
    //                    EXTERNAL FUNCTIONS
    // ============================================================

    /**
     * @notice Store a new ML prediction result on-chain.
     * @param _cropId ID of the crop this prediction is for
     * @param _predType Type of prediction (CropHealth, DiseaseRisk, etc.)
     * @param _resultHash keccak256 hash of the full prediction JSON
     * @param _confidence Confidence score (0-100)
     */
    function storePrediction(
        uint256 _cropId,
        PredictionType _predType,
        bytes32 _resultHash,
        uint8 _confidence
    ) external onlyOracle {
        require(_resultHash != bytes32(0), "Result hash cannot be empty");
        require(_confidence <= 100, "Confidence must be 0-100");

        predictionCount++;
        uint256 newId = predictionCount;

        predictions[newId] = Prediction({
            id: newId,
            cropId: _cropId,
            predType: _predType,
            resultHash: _resultHash,
            confidence: _confidence,
            submittedBy: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        cropPredictions[_cropId].push(newId);

        emit PredictionStored(
            newId,
            _cropId,
            _predType,
            _resultHash,
            _confidence,
            msg.sender,
            block.timestamp
        );
    }

    // ============================================================
    //                      VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Get a specific prediction by ID
     * @param _predId Prediction ID
     */
    function getPrediction(
        uint256 _predId
    ) external view returns (Prediction memory) {
        require(predictions[_predId].exists, "Prediction does not exist");
        return predictions[_predId];
    }

    /**
     * @notice Get all prediction IDs for a specific crop
     * @param _cropId Crop ID
     * @return Array of prediction IDs
     */
    function getPredictionsByCrop(
        uint256 _cropId
    ) external view returns (uint256[] memory) {
        return cropPredictions[_cropId];
    }

    /**
     * @notice Verify if a given raw data string produces the stored hash.
     *         This is how anyone can verify the integrity of off-chain data.
     * @param _predId Prediction ID to verify against
     * @param _rawData The raw prediction JSON string
     * @return true if the hash matches
     */
    function verifyPrediction(
        uint256 _predId,
        string calldata _rawData
    ) external view returns (bool) {
        require(predictions[_predId].exists, "Prediction does not exist");
        bytes32 computedHash = keccak256(abi.encodePacked(_rawData));
        return computedHash == predictions[_predId].resultHash;
    }
}
