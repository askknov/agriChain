const express = require("express");
const router = express.Router();
const Crop = require("../models/Crop");

// GET /api/crops — List all crops (with optional filter by farmer)
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.farmer) {
      filter.farmerAddress = req.query.farmer.toLowerCase();
    }
    const crops = await Crop.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: crops });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/crops/:id — Get a single crop
router.get("/:id", async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) {
      return res.status(404).json({ success: false, error: "Crop not found" });
    }
    res.json({ success: true, data: crop });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/crops — Register a new crop
router.post("/", async (req, res) => {
  try {
    const {
      onChainId,
      farmerAddress,
      cropType,
      location,
      plantingDate,
      soilType,
      irrigationType,
      notes,
      txHash,
    } = req.body;

    const crop = await Crop.create({
      onChainId,
      farmerAddress: farmerAddress.toLowerCase(),
      cropType,
      location,
      plantingDate,
      soilType: soilType || "",
      irrigationType: irrigationType || "",
      notes: notes || "",
      txHash: txHash || "",
    });

    res.status(201).json({ success: true, data: crop });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/crops/:id/status — Update crop status
router.put("/:id/status", async (req, res) => {
  try {
    const { status, txHash } = req.body;
    const crop = await Crop.findByIdAndUpdate(
      req.params.id,
      { status, txHash },
      { new: true }
    );
    if (!crop) {
      return res.status(404).json({ success: false, error: "Crop not found" });
    }
    res.json({ success: true, data: crop });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/crops/stats/overview — Get crop statistics
router.get("/stats/overview", async (req, res) => {
  try {
    const total = await Crop.countDocuments();
    const byStatus = await Crop.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const byType = await Crop.aggregate([
      { $group: { _id: "$cropType", count: { $sum: 1 } } },
    ]);
    res.json({ success: true, data: { total, byStatus, byType } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
