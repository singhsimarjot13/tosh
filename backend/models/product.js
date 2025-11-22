import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  // Primary product code
  itemNo: { type: String, required: true, unique: true },  // 3.5X13-DS-BLK

  // Product name / title
  name: { type: String, required: true },

  // Full item description
  description: { type: String, required: true },

  imageURL: { type: String },

  // BOM type
  bomType: { type: String, default: "Not a BOM" },

  // Sales Unit of Measurement (BOX / CARTON / PIECE etc.)
  salesUom: {
    type: String,
    enum: ["BOX", "CARTON", "PIECE"],
    required: true
  },

  // How many pieces inside a box or carton
  boxQuantity: { type: Number, required: true },   // Example: 20 pcs per BOX

  // Stock quantity (optional)
  uom: { type: Number, default: 0 },

  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  rewardsperunit: { type: Number, default: 0 }, // Rewards per unit

}, { timestamps: true });

// Index on itemNo for fast lookup
ProductSchema.index({ itemNo: 1 });

export default mongoose.model("Product", ProductSchema);
