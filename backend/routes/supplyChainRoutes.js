const express = require("express");
const router = express.Router();
const Batch = require("../models/Batch");

// GET /api/supplychain — List all batches
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.handler) {
      filter.currentHandler = req.query.handler.toLowerCase();
    }
    const batches = await Batch.find(filter)
      .populate("cropId")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: batches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/supplychain/:id — Get a single batch with transfer history
router.get("/:id", async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id).populate("cropId");
    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }
    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/supplychain — Create a new batch
router.post("/", async (req, res) => {
  try {
    const {
      onChainId,
      cropId,
      onChainCropId,
      quantity,
      unit,
      currentHandler,
      currentHandlerName,
      txHash,
    } = req.body;

    const batch = await Batch.create({
      onChainId,
      cropId,
      onChainCropId,
      quantity,
      unit,
      currentHandler: currentHandler.toLowerCase(),
      currentHandlerName,
      currentHandlerRole: "Farmer",
      txHash: txHash || "",
    });

    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/supplychain/:id/transfer — Record a batch transfer
router.put("/:id/transfer", async (req, res) => {
  try {
    const { to, toName, toRole, newStatus, notes, txHash } = req.body;

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }

    // Record the transfer
    batch.transfers.push({
      from: batch.currentHandler,
      to: to.toLowerCase(),
      fromName: batch.currentHandlerName,
      toName,
      fromRole: batch.currentHandlerRole,
      toRole,
      timestamp: new Date(),
      notes: notes || "",
      txHash: txHash || "",
    });

    // Update current handler
    batch.currentHandler = to.toLowerCase();
    batch.currentHandlerName = toName;
    batch.currentHandlerRole = toRole;
    batch.status = newStatus;

    await batch.save();

    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/supplychain/:id/history — Get transfer history for a batch
router.get("/:id/history", async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }
    res.json({ success: true, data: batch.transfers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/supplychain/stats/overview — Supply chain statistics
router.get("/stats/overview", async (req, res) => {
  try {
    const total = await Batch.countDocuments();
    const byStatus = await Batch.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const totalTransfers = await Batch.aggregate([
      { $project: { transferCount: { $size: "$transfers" } } },
      { $group: { _id: null, total: { $sum: "$transferCount" } } },
    ]);
    res.json({
      success: true,
      data: {
        totalBatches: total,
        byStatus,
        totalTransfers: totalTransfers[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
