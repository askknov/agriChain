// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FarmerRegistry
 * @author AgriChain Project
 * @notice Manages farmer registration and verification on the blockchain.
 * @dev Only registered and verified farmers can interact with other contracts.
 *      The contract owner (admin) can verify farmers after off-chain KYC.
 */
contract FarmerRegistry is Ownable {
    // ============================================================
    //                        DATA STRUCTURES
    // ============================================================

    struct Farmer {
        string name;
        string location; // e.g., "Pune, Maharashtra"
        uint256 registeredAt;
        bool isRegistered;
        bool isVerified;
    }

    // ============================================================
    //                        STATE VARIABLES
    // ============================================================

    /// @notice Maps wallet address to farmer profile
    mapping(address => Farmer) public farmers;

    /// @notice Array of all registered farmer addresses (for enumeration)
    address[] public farmerAddresses;

    /// @notice Total number of registered farmers
    uint256 public farmerCount;

    // ============================================================
    //                           EVENTS
    // ============================================================

    event FarmerRegistered(
        address indexed farmerAddress,
        string name,
        string location,
        uint256 timestamp
    );

    event FarmerVerified(address indexed farmerAddress, uint256 timestamp);

    // ============================================================
    //                          MODIFIERS
    // ============================================================

    modifier notRegistered() {
        require(!farmers[msg.sender].isRegistered, "Farmer already registered");
        _;
    }

    modifier onlyRegistered(address _farmer) {
        require(farmers[_farmer].isRegistered, "Farmer not registered");
        _;
    }

    // ============================================================
    //                        CONSTRUCTOR
    // ============================================================

    /**
     * @notice Sets the deployer as the contract admin (owner).
     */
    constructor() Ownable(msg.sender) {}

    // ============================================================
    //                    EXTERNAL FUNCTIONS
    // ============================================================

    /**
     * @notice Register a new farmer. Called by the farmer themselves.
     * @param _name Full name of the farmer
     * @param _location Location string (e.g., "District, State")
     */
    function registerFarmer(
        string calldata _name,
        string calldata _location
    ) external notRegistered {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_location).length > 0, "Location cannot be empty");

        farmers[msg.sender] = Farmer({
            name: _name,
            location: _location,
            registeredAt: block.timestamp,
            isRegistered: true,
            isVerified: false
        });

        farmerAddresses.push(msg.sender);
        farmerCount++;

        emit FarmerRegistered(msg.sender, _name, _location, block.timestamp);
    }

    /**
     * @notice Verify a registered farmer. Only admin can call this.
     * @param _farmer Address of the farmer to verify
     */
    function verifyFarmer(
        address _farmer
    ) external onlyOwner onlyRegistered(_farmer) {
        require(!farmers[_farmer].isVerified, "Farmer already verified");
        farmers[_farmer].isVerified = true;
        emit FarmerVerified(_farmer, block.timestamp);
    }

    // ============================================================
    //                      VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Get full details of a farmer
     * @param _farmer Address of the farmer
     * @return name Farmer's name
     * @return location Farmer's location
     * @return registeredAt Registration timestamp
     * @return isRegistered Whether the farmer is registered
     * @return isVerified Whether the farmer is verified by admin
     */
    function getFarmerDetails(
        address _farmer
    )
        external
        view
        returns (
            string memory name,
            string memory location,
            uint256 registeredAt,
            bool isRegistered,
            bool isVerified
        )
    {
        Farmer memory f = farmers[_farmer];
        return (f.name, f.location, f.registeredAt, f.isRegistered, f.isVerified);
    }

    /**
     * @notice Check if an address is a registered farmer
     * @param _farmer Address to check
     * @return true if registered
     */
    function isRegistered(address _farmer) external view returns (bool) {
        return farmers[_farmer].isRegistered;
    }

    /**
     * @notice Check if a farmer is verified
     * @param _farmer Address to check
     * @return true if verified
     */
    function isVerified(address _farmer) external view returns (bool) {
        return farmers[_farmer].isVerified;
    }

    /**
     * @notice Get all registered farmer addresses
     * @return Array of farmer addresses
     */
    function getAllFarmers() external view returns (address[] memory) {
        return farmerAddresses;
    }
}
