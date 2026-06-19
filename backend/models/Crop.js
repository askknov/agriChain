const mongoose = require("mongoose");

const cropSchema = new mongoose.Schema(
  {
    onChainId: { type: Number, default: null }, // ID from smart contract
    farmerAddress: { type: String, required: true, lowercase: true },
    cropType: { type: String, required: true },
    location: { type: String, required: true },
    plantingDate: { type: Date, required: true },
    status: {
      type: String,
      enum: [
        "Planted",
        "Growing",
        "ReadyForHarvest",
        "Harvested",
        "InTransit",
        "Delivered",
      ],
      default: "Planted",
    },
    images: [{ type: String }], // URLs to crop images
    soilType: { type: String, default: "" },
    irrigationType: { type: String, default: "" },
    notes: { type: String, default: "" },
    txHash: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Crop", cropSchema);
