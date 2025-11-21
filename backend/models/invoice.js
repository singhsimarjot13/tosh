import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  productID: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

  // Item fields
  itemCode: { type: String, required: true },
  itemName: { type: String, required: true },

  customerVendorCode: { type: String, required: true },
  customerVendorName: { type: String, required: true },

  qty: { type: Number, required: true },

  uom: {
    type: String,
    enum: ["BOX", "CARTON", "PIECE"],
    required: true
  },

  pieces: { type: Number }, // Auto calculated

  amount: { type: Number, required: true },

  // NEW FIELD: how points should be calculated
  pointsMode: {
    type: String,
    enum: ["PIECE", "AMOUNT"],
    required: true
  },

  points: { type: Number, default: 0 },

  date: { type: Date, default: Date.now }
});

// Pre-save hook
InvoiceSchema.pre("save", function (next) {
  // Calculate pieces
  if (this.uom === "BOX") this.pieces = this.qty * 10;
  else if (this.uom === "CARTON") this.pieces = this.qty * 100;
  else if (this.uom === "PIECE") this.pieces = this.qty * 1;

  // Calculate points
  if (this.pointsMode === "PIECE") {
    // 1 piece = 10 pts
    this.points = this.pieces * 10;
  } else if (this.pointsMode === "AMOUNT") {
    // 0.01 rupee = 10 pts
    // 1 rupee = 1000 pts
    this.points = (this.amount / 0.01) * 10;
  }

  next();
});

export default mongoose.model("Invoice", InvoiceSchema);
