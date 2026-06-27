const express = require("express");
const router = express.Router();
const multer = require("multer");
const Prediction = require("../models/Prediction");
const Crop = require("../models/Crop");
const { analyzeCrop, analyzeSingle } = require("../services/mlService");
const { storePredictionOnChain } = require("../services/blockchainService");
const { ethers } = require("ethers");

// Multer config for image uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});
// Prediction type name → on-chain enum index
const PRED_TYPE_INDEX = {
  CropHealth: 0,
  DiseaseRisk: 1,
  YieldPrediction: 2,
  MarketPrice: 3,
  Recommendation: 4,
};

// POST /api/predictions/analyze/:cropId — Run ML analysis on a crop
router.post("/analyze/:cropId", async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.cropId);
    if (!crop) {
      return res.status(404).json({ success: false, error: "Crop not found" });
    }

    // Run all 5 ML predictions
    const predictions = await analyzeCrop({
      cropType: crop.cropType,
      location: crop.location,
      soilType: crop.soilType,
    });

    const savedPredictions = [];

    for (const pred of predictions) {
      const resultJson = JSON.stringify(pred.result);

      // Save to MongoDB
      const saved = await Prediction.create({
        cropId: crop._id,
        onChainCropId: crop.onChainId || 0,
        predictionType: pred.predictionType,
        result: pred.result,
        confidence: pred.confidence,
        resultHash: ethers.keccak256(ethers.toUtf8Bytes(resultJson)),
      });

      // Try to store on blockchain (non-blocking — won't fail the request)
      if (crop.onChainId) {
        try {
          const onChainResult = await storePredictionOnChain(
            crop.onChainId,
            PRED_TYPE_INDEX[pred.predictionType],
            resultJson,
            pred.confidence
          );

          saved.onChainId = onChainResult.predictionId;
          saved.txHash = onChainResult.txHash;
          saved.isOnChain = true;
          await saved.save();
        } catch (bcError) {
          console.log(
            `⚠️  Blockchain storage skipped for ${pred.predictionType}: ${bcError.message}`
          );
        }
      }

      savedPredictions.push(saved);
    }

    res.json({ success: true, data: savedPredictions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/predictions/crop/:cropId — Get all predictions for a crop
router.get("/crop/:cropId", async (req, res) => {
  try {
    const predictions = await Prediction.find({
      cropId: req.params.cropId,
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: predictions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/predictions/:id — Get a single prediction
router.get("/:id", async (req, res) => {
  try {
    const prediction = await Prediction.findById(req.params.id);
    if (!prediction) {
      return res
        .status(404)
        .json({ success: false, error: "Prediction not found" });
    }
    res.json({ success: true, data: prediction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/predictions/verify/:id — Verify a prediction against blockchain
router.post("/verify/:id", async (req, res) => {
  try {
    const prediction = await Prediction.findById(req.params.id);
    if (!prediction) {
      return res
        .status(404)
        .json({ success: false, error: "Prediction not found" });
    }

    if (!prediction.isOnChain) {
      return res.json({
        success: true,
        verified: false,
        reason: "Prediction not stored on blockchain",
      });
    }

    const rawData = JSON.stringify(prediction.result);
    const computedHash = ethers.keccak256(ethers.toUtf8Bytes(rawData));
    const isVerified = computedHash === prediction.resultHash;

    res.json({
      success: true,
      verified: isVerified,
      onChainHash: prediction.resultHash,
      computedHash: computedHash,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/predictions/scan-image — Scan a crop leaf image for disease
router.post("/scan-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No image file provided" });
    }

    const ML_BASE = (process.env.ML_API_URL || "http://localhost:8000/api/predict").replace("/api/predict", "");

    // Build multipart form using Node.js native FormData + Blob
    const formData = new FormData();
    const imageBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append("image", imageBlob, req.file.originalname);

    // Add optional weather params from request body
    if (req.body.temperature) formData.append("temperature", req.body.temperature);
    if (req.body.humidity) formData.append("humidity", req.body.humidity);
    if (req.body.rainfall) formData.append("rainfall", req.body.rainfall);

    const response = await fetch(`${ML_BASE}/api/predict/image`, {
      method: "POST",
      body: formData,
    });

    const mlResult = await response.json();

    if (!mlResult.success) {
      return res.status(500).json({ success: false, error: mlResult.error || "ML scan failed" });
    }

    // Save scan result as a Prediction in MongoDB
    const scanData = mlResult.data;
    const resultJson = JSON.stringify(scanData);

    const saved = await Prediction.create({
      cropId: req.body.cropId || null,
      onChainCropId: 0,
      predictionType: "ImageScan",
      result: {
        score: scanData.health_score,
        label: scanData.disease_name,
        details: `Disease scan: ${scanData.disease_name} detected with ${scanData.confidence}% confidence. ` +
                 `Crop: ${scanData.crop_type}. Health: ${scanData.is_healthy ? "Healthy" : "Diseased"}.`,
        recommendations: scanData.recommendations || [],
        metadata: scanData,
      },
      confidence: Math.round(scanData.confidence),
      resultHash: ethers.keccak256(ethers.toUtf8Bytes(resultJson)),
    });

    res.json({ success: true, data: saved, scanResult: scanData });
  } catch (error) {
    console.error("Image scan error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
