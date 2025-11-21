import mongoose from "mongoose";

const UserProductAllocationSchema = new mongoose.Schema({
  userID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  productID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product", 
    required: true 
  },

  // Quantity based on Sales UoM of Product (BOX / CARTON / PIECE)
  qty: { 
    type: Number, 
    default: 0 
  },

  // Auto-calculated pieces (qty × boxQuantity)
  pieces: { 
    type: Number, 
    default: 0 
  },

  // For reference: the UOM assigned to the user (same as product's sales UoM)
  uom: {
    type: String,
    enum: ["BOX", "CARTON", "PIECE"]
  }

}, { timestamps: true });

// Unique allocation for each user-product pair
UserProductAllocationSchema.index(
  { userID: 1, productID: 1 }, 
  { unique: true }
);

// Auto-calculate pieces before saving
UserProductAllocationSchema.pre("save", async function (next) {
  const Product = mongoose.model("Product");

  // Fetch product to get boxQuantity and UOM
  const product = await Product.findById(this.productID);

  if (!product) return next(new Error("Product not found"));

  // auto-assign user UOM = product UOM
  this.uom = product.salesUom;

  // PIECE CALCULATION
  if (product.salesUom === "BOX") {
    this.pieces = this.qty * product.boxQuantity;
  } else if (product.salesUom === "CARTON") {
    this.pieces = this.qty * product.boxQuantity; // carton items also stored in boxQuantity
  } else if (product.salesUom === "PIECE") {
    this.pieces = this.qty;
  }

  next();
});

export default mongoose.model("UserProductAllocation", UserProductAllocationSchema);
