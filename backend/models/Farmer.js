const mongoose = require("mongoose");

const farmerSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    name: { type: String, required: true },
    location: { type: String, required: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    farmSize: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    txHash: { type: String, default: "" }, // blockchain registration tx hash
  },
  { timestamps: true }
);

module.exports = mongoose.model("Farmer", farmerSchema);
