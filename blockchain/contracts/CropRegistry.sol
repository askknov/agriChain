// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CropRegistry
 * @author AgriChain Project
 * @notice Records crop lifecycle events on-chain.
 * @dev Only registered farmers (verified via FarmerRegistry) can register crops.
 *      Crop images and detailed data are stored off-chain; only metadata is on-chain.
 */
contract CropRegistry is Ownable {
    // ============================================================
    //                        DATA STRUCTURES
    // ============================================================

    enum CropStatus {
        Planted,
        Growing,
        ReadyForHarvest,
        Harvested,
        InTransit,
        Delivered
    }

    struct Crop {
        uint256 id;
        address farmer;
        string cropType; // e.g., "Wheat", "Rice", "Tomato"
        string location;
        uint256 plantingDate;
        CropStatus status;
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
    }

    // ============================================================
    //                      EXTERNAL CONTRACT
    // ============================================================

    /// @notice Reference to the FarmerRegistry for access control
    address public farmerRegistryAddress;

    // ============================================================
    //                        STATE VARIABLES
    // ============================================================

    /// @notice Auto-incrementing crop ID counter
    uint256 public cropCount;

    /// @notice Maps crop ID to Crop struct
    mapping(uint256 => Crop) public crops;

    /// @notice Maps farmer address to their crop IDs
    mapping(address => uint256[]) public farmerCrops;

    // ============================================================
    //                           EVENTS
    // ============================================================

    event CropRegistered(
        uint256 indexed cropId,
        address indexed farmer,
        string cropType,
        string location,
        uint256 plantingDate,
        uint256 timestamp
    );

    event CropStatusUpdated(
        uint256 indexed cropId,
        CropStatus oldStatus,
        CropStatus newStatus,
        uint256 timestamp
    );

    // ============================================================
    //                          MODIFIERS
    // ============================================================

    modifier onlyRegisteredFarmer() {
        // Minimal interface call to check registration
        (bool success, bytes memory data) = farmerRegistryAddress.staticcall(
            abi.encodeWithSignature("isRegistered(address)", msg.sender)
        );
        require(success && abi.decode(data, (bool)), "Not a registered farmer");
        _;
    }

    modifier onlyCropOwner(uint256 _cropId) {
        require(crops[_cropId].exists, "Crop does not exist");
        require(crops[_cropId].farmer == msg.sender, "Not the crop owner");
        _;
    }

    modifier cropExists(uint256 _cropId) {
        require(crops[_cropId].exists, "Crop does not exist");
        _;
    }

    // ============================================================
    //                        CONSTRUCTOR
    // ============================================================

    /**
     * @param _farmerRegistry Address of the deployed FarmerRegistry contract
     */
    constructor(address _farmerRegistry) Ownable(msg.sender) {
        require(_farmerRegistry != address(0), "Invalid registry address");
        farmerRegistryAddress = _farmerRegistry;
    }

    // ============================================================
    //                    EXTERNAL FUNCTIONS
    // ============================================================

    /**
     * @notice Register a new crop. Only registered farmers can call this.
     * @param _cropType Type of crop (e.g., "Wheat")
     * @param _plantingDate Unix timestamp of planting date
     * @param _location Field location
     */
    function registerCrop(
        string calldata _cropType,
        uint256 _plantingDate,
        string calldata _location
    ) external onlyRegisteredFarmer {
        require(bytes(_cropType).length > 0, "Crop type cannot be empty");
        require(bytes(_location).length > 0, "Location cannot be empty");

        cropCount++;
        uint256 newCropId = cropCount;

        crops[newCropId] = Crop({
            id: newCropId,
            farmer: msg.sender,
            cropType: _cropType,
            location: _location,
            plantingDate: _plantingDate,
            status: CropStatus.Planted,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            exists: true
        });

        farmerCrops[msg.sender].push(newCropId);

        emit CropRegistered(
            newCropId,
            msg.sender,
            _cropType,
            _location,
            _plantingDate,
            block.timestamp
        );
    }

    /**
     * @notice Update the status of a crop. Only the crop owner can call this.
     * @param _cropId ID of the crop to update
     * @param _newStatus New status value
     */
    function updateCropStatus(
        uint256 _cropId,
        CropStatus _newStatus
    ) external onlyCropOwner(_cropId) {
        Crop storage crop = crops[_cropId];
        CropStatus oldStatus = crop.status;

        // Ensure status moves forward (can't go backwards)
        require(uint8(_newStatus) > uint8(oldStatus), "Status can only move forward");

        crop.status = _newStatus;
        crop.updatedAt = block.timestamp;

        emit CropStatusUpdated(_cropId, oldStatus, _newStatus, block.timestamp);
    }

    // ============================================================
    //                      VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Get details of a specific crop
     * @param _cropId ID of the crop
     */
    function getCropDetails(
        uint256 _cropId
    ) external view cropExists(_cropId) returns (Crop memory) {
        return crops[_cropId];
    }

    /**
     * @notice Get all crop IDs for a specific farmer
     * @param _farmer Address of the farmer
     * @return Array of crop IDs
     */
    function getCropsByFarmer(
        address _farmer
    ) external view returns (uint256[] memory) {
        return farmerCrops[_farmer];
    }

    /**
     * @notice Get the total number of crops registered
     * @return Total crop count
     */
    function getTotalCrops() external view returns (uint256) {
        return cropCount;
    }
}
