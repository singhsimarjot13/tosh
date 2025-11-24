import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    // Primary product code
    itemNo: { type: String, required: true, unique: true },

    // Product name / title (mirrors itemDescription for backwards compatibility)
    name: { type: String, required: true },

    // Full item description
    itemDescription: { type: String, required: true },

    description: { type: String, required: true },

    imageURL: { type: String, default: null },

    // BOM type
    bomType: { type: String, default: "Not a BOM" },

    // Reward + packaging metadata
    boxQuantity: { type: Number, default: 0 },
    cartonQuantity: { type: Number, default: 0 },
    rewardsPerPc: { type: Number, default: 0 },
    rewardsPerDozen: { type: Number, default: 0 },
    rewardsForBox: { type: Number, default: 0 },
    rewardsForCarton: { type: Number, default: 0 },

    // Legacy / stock fields retained for other modules
    totalPieces: { type: Number, default: 0 },
    uom: { type: Number, default: 0 },

    status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
  },
  { timestamps: true }
);

// Index on itemNo for fast lookup
ProductSchema.index({ itemNo: 1 });

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const applyRewardCalculations = (product) => {
  product.boxQuantity = toNumber(product.boxQuantity);
  product.cartonQuantity = toNumber(product.cartonQuantity);
  product.rewardsPerPc = toNumber(product.rewardsPerPc);

  product.rewardsPerDozen = product.rewardsPerPc * 12;
  product.rewardsForBox = product.boxQuantity * product.rewardsPerPc;
  product.rewardsForCarton = product.cartonQuantity * product.rewardsPerPc;
};

ProductSchema.pre("save", function (next) {
  this.name = this.itemDescription || this.name;
  this.description = this.itemDescription || this.description;
  applyRewardCalculations(this);
  next();
});

export default mongoose.model("Product", ProductSchema);
