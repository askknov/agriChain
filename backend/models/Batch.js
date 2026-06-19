const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    onChainId: { type: Number, default: null },
    cropId: { type: mongoose.Schema.Types.ObjectId, ref: "Crop" },
    onChainCropId: { type: Number },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    currentHandler: { type: String, lowercase: true },
    currentHandlerName: { type: String },
    currentHandlerRole: { type: String },
    status: {
      type: String,
      enum: [
        "Created",
        "Processing",
        "Processed",
        "InTransit",
        "Delivered",
        "AtRetailer",
        "Sold",
      ],
      default: "Created",
    },
    transfers: [
      {
        from: String,
        to: String,
        fromName: String,
        toName: String,
        fromRole: String,
        toRole: String,
        timestamp: Date,
        notes: String,
        txHash: String,
      },
    ],
    txHash: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Batch", batchSchema);
