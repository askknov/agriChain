const express = require("express");
const router = express.Router();
const Farmer = require("../models/Farmer");

// GET /api/farmers — List all farmers
router.get("/", async (req, res) => {
  try {
    const farmers = await Farmer.find().sort({ createdAt: -1 });
    res.json({ success: true, data: farmers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/farmers/:address — Get a farmer by wallet address
router.get("/:address", async (req, res) => {
  try {
    const farmer = await Farmer.findOne({
      walletAddress: req.params.address.toLowerCase(),
    });
    if (!farmer) {
      return res.status(404).json({ success: false, error: "Farmer not found" });
    }
    res.json({ success: true, data: farmer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/farmers — Register a farmer (off-chain data)
router.post("/", async (req, res) => {
  try {
    const { walletAddress, name, location, phone, email, farmSize, txHash } =
      req.body;

    // Check if farmer already exists
    const existing = await Farmer.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, error: "Farmer already registered" });
    }

    const farmer = await Farmer.create({
      walletAddress: walletAddress.toLowerCase(),
      name,
      location,
      phone: phone || "",
      email: email || "",
      farmSize: farmSize || "",
      txHash: txHash || "",
    });

    res.status(201).json({ success: true, data: farmer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/farmers/:address/verify — Mark farmer as verified
router.put("/:address/verify", async (req, res) => {
  try {
    const farmer = await Farmer.findOneAndUpdate(
      { walletAddress: req.params.address.toLowerCase() },
      { isVerified: true },
      { new: true }
    );
    if (!farmer) {
      return res.status(404).json({ success: false, error: "Farmer not found" });
    }
    res.json({ success: true, data: farmer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/farmers/stats/overview — Get farmer statistics
router.get("/stats/overview", async (req, res) => {
  try {
    const total = await Farmer.countDocuments();
    const verified = await Farmer.countDocuments({ isVerified: true });
    res.json({
      success: true,
      data: { total, verified, unverified: total - verified },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
