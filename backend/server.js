/**
 * @file server.js
 * @description Express server entry point for the AgriChain backend.
 *
 * Start: npm start (or node server.js)
 * Dev:   npm run dev (with nodemon)
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const { initBlockchain } = require("./services/blockchainService");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── Connect to MongoDB ──────────────────────────────────────
connectDB();

// ── Initialize Blockchain Service ───────────────────────────
initBlockchain();

// ── API Routes ──────────────────────────────────────────────
app.use("/api/farmers", require("./routes/farmerRoutes"));
app.use("/api/crops", require("./routes/cropRoutes"));
app.use("/api/predictions", require("./routes/predictionRoutes"));
app.use("/api/supplychain", require("./routes/supplyChainRoutes"));

// ── Health Check ────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      backend: "running",
      database: require("mongoose").connection.readyState === 1 ? "connected" : "disconnected",
    },
  });
});

// ── Dashboard Stats (aggregate) ─────────────────────────────
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const Farmer = require("./models/Farmer");
    const Crop = require("./models/Crop");
    const Prediction = require("./models/Prediction");
    const Batch = require("./models/Batch");

    const [farmerCount, cropCount, predictionCount, batchCount] =
      await Promise.all([
        Farmer.countDocuments(),
        Crop.countDocuments(),
        Prediction.countDocuments(),
        Batch.countDocuments(),
      ]);

    res.json({
      success: true,
      data: {
        farmers: farmerCount,
        crops: cropCount,
        predictions: predictionCount,
        batches: batchCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`  🌾 AgriChain Backend Server`);
  console.log(`  🚀 Running on http://localhost:${PORT}`);
  console.log(`  📊 Health: http://localhost:${PORT}/api/health`);
  console.log("=".repeat(50));
});
