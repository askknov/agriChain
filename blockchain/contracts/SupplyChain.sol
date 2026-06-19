// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SupplyChain
 * @author AgriChain Project
 * @notice Tracks agricultural produce from farm to market on-chain.
 * @dev Each batch is linked to a harvested crop and records every transfer
 *      between handlers (Farmer → Processor → Distributor → Retailer).
 *      The complete history is stored as events for gas efficiency.
 */
contract SupplyChain is Ownable {
    // ============================================================
    //                        DATA STRUCTURES
    // ============================================================

    enum BatchStatus {
        Created,
        Processing,
        Processed,
        InTransit,
        Delivered,
        AtRetailer,
        Sold
    }

    struct Batch {
        uint256 id;
        uint256 cropId;
        address currentHandler;
        string currentHandlerName;
        string currentHandlerRole; // "Farmer", "Processor", "Distributor", "Retailer"
        uint256 quantity;
        string unit; // "kg", "quintal", "ton"
        BatchStatus status;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 transferCount;
        bool exists;
    }

    struct TransferRecord {
        address from;
        address to;
        string fromName;
        string toName;
        string fromRole;
        string toRole;
        uint256 timestamp;
        string notes;
    }

    // ============================================================
    //                        STATE VARIABLES
    // ============================================================

    uint256 public batchCount;

    mapping(uint256 => Batch) public batches;
    mapping(uint256 => TransferRecord[]) public batchTransfers;
    mapping(address => uint256[]) public handlerBatches;

    /// @notice Reference to CropRegistry for validation
    address public cropRegistryAddress;

    // ============================================================
    //                           EVENTS
    // ============================================================

    event BatchCreated(
        uint256 indexed batchId,
        uint256 indexed cropId,
        address indexed farmer,
        uint256 quantity,
        string unit,
        uint256 timestamp
    );

    event BatchTransferred(
        uint256 indexed batchId,
        address indexed from,
        address indexed to,
        string fromRole,
        string toRole,
        uint256 timestamp
    );

    event BatchStatusUpdated(
        uint256 indexed batchId,
        BatchStatus oldStatus,
        BatchStatus newStatus,
        uint256 timestamp
    );

    // ============================================================
    //                          MODIFIERS
    // ============================================================

    modifier onlyCurrentHandler(uint256 _batchId) {
        require(batches[_batchId].exists, "Batch does not exist");
        require(
            batches[_batchId].currentHandler == msg.sender,
            "Not the current handler"
        );
        _;
    }

    modifier batchExists(uint256 _batchId) {
        require(batches[_batchId].exists, "Batch does not exist");
        _;
    }

    // ============================================================
    //                        CONSTRUCTOR
    // ============================================================

    /**
     * @param _cropRegistry Address of the deployed CropRegistry contract
     */
    constructor(address _cropRegistry) Ownable(msg.sender) {
        require(_cropRegistry != address(0), "Invalid registry address");
        cropRegistryAddress = _cropRegistry;
    }

    // ============================================================
    //                    EXTERNAL FUNCTIONS
    // ============================================================

    /**
     * @notice Create a new batch from a harvested crop.
     * @param _cropId ID of the crop this batch comes from
     * @param _quantity Amount of produce
     * @param _unit Unit of measurement (e.g., "kg")
     * @param _farmerName Name of the farmer creating the batch
     */
    function createBatch(
        uint256 _cropId,
        uint256 _quantity,
        string calldata _unit,
        string calldata _farmerName
    ) external {
        require(_quantity > 0, "Quantity must be greater than 0");
        require(bytes(_unit).length > 0, "Unit cannot be empty");

        batchCount++;
        uint256 newBatchId = batchCount;

        batches[newBatchId] = Batch({
            id: newBatchId,
            cropId: _cropId,
            currentHandler: msg.sender,
            currentHandlerName: _farmerName,
            currentHandlerRole: "Farmer",
            quantity: _quantity,
            unit: _unit,
            status: BatchStatus.Created,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            transferCount: 0,
            exists: true
        });

        handlerBatches[msg.sender].push(newBatchId);

        emit BatchCreated(
            newBatchId,
            _cropId,
            msg.sender,
            _quantity,
            _unit,
            block.timestamp
        );
    }

    /**
     * @notice Transfer a batch to the next handler in the supply chain.
     * @param _batchId ID of the batch to transfer
     * @param _to Address of the new handler
     * @param _toName Name of the new handler
     * @param _toRole Role of the new handler (Processor, Distributor, Retailer)
     * @param _newStatus New batch status after transfer
     * @param _notes Any notes about this transfer
     */
    function transferBatch(
        uint256 _batchId,
        address _to,
        string calldata _toName,
        string calldata _toRole,
        BatchStatus _newStatus,
        string calldata _notes
    ) external onlyCurrentHandler(_batchId) {
        require(_to != address(0), "Invalid recipient address");
        require(_to != msg.sender, "Cannot transfer to yourself");

        Batch storage batch = batches[_batchId];
        BatchStatus oldStatus = batch.status;

        // Record the transfer
        batchTransfers[_batchId].push(
            TransferRecord({
                from: msg.sender,
                to: _to,
                fromName: batch.currentHandlerName,
                toName: _toName,
                fromRole: batch.currentHandlerRole,
                toRole: _toRole,
                timestamp: block.timestamp,
                notes: _notes
            })
        );

        // Update batch
        batch.currentHandler = _to;
        batch.currentHandlerName = _toName;
        batch.currentHandlerRole = _toRole;
        batch.status = _newStatus;
        batch.updatedAt = block.timestamp;
        batch.transferCount++;

        handlerBatches[_to].push(_batchId);

        emit BatchTransferred(
            _batchId,
            msg.sender,
            _to,
            batch.currentHandlerRole,
            _toRole,
            block.timestamp
        );

        emit BatchStatusUpdated(_batchId, oldStatus, _newStatus, block.timestamp);
    }

    /**
     * @notice Update batch status without transferring (e.g., Processing → Processed)
     * @param _batchId ID of the batch
     * @param _newStatus New status
     */
    function updateBatchStatus(
        uint256 _batchId,
        BatchStatus _newStatus
    ) external onlyCurrentHandler(_batchId) {
        Batch storage batch = batches[_batchId];
        BatchStatus oldStatus = batch.status;
        batch.status = _newStatus;
        batch.updatedAt = block.timestamp;

        emit BatchStatusUpdated(_batchId, oldStatus, _newStatus, block.timestamp);
    }

    // ============================================================
    //                      VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Get details of a specific batch
     */
    function getBatchDetails(
        uint256 _batchId
    ) external view batchExists(_batchId) returns (Batch memory) {
        return batches[_batchId];
    }

    /**
     * @notice Get the full transfer history of a batch
     * @param _batchId Batch ID
     * @return Array of TransferRecord structs
     */
    function getBatchHistory(
        uint256 _batchId
    ) external view batchExists(_batchId) returns (TransferRecord[] memory) {
        return batchTransfers[_batchId];
    }

    /**
     * @notice Get all batch IDs handled by an address
     */
    function getBatchesByHandler(
        address _handler
    ) external view returns (uint256[] memory) {
        return handlerBatches[_handler];
    }

    /**
     * @notice Get the number of transfers for a batch
     */
    function getTransferCount(
        uint256 _batchId
    ) external view batchExists(_batchId) returns (uint256) {
        return batchTransfers[_batchId].length;
    }
}
