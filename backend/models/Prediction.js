const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    onChainId: { type: Number, default: null },
    cropId: { type: mongoose.Schema.Types.ObjectId, ref: "Crop" },
    onChainCropId: { type: Number, required: true },
    predictionType: {
      type: String,
      enum: [
        "CropHealth",
        "DiseaseRisk",
        "YieldPrediction",
        "MarketPrice",
        "Recommendation",
      ],
      required: true,
    },
    // Full prediction result (this is what gets hashed for on-chain storage)
    result: {
      score: { type: Number }, // 0-100
      label: { type: String }, // e.g., "Healthy", "High Risk"
      details: { type: String },
      recommendations: [{ type: String }],
      metadata: { type: mongoose.Schema.Types.Mixed }, // additional ML data
    },
    resultHash: { type: String, default: "" }, // keccak256 hash stored on-chain
    confidence: { type: Number, default: 0 },
    txHash: { type: String, default: "" },
    isOnChain: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Prediction", predictionSchema);
