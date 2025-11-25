import mongoose from "mongoose";

const InvoiceItemSchema = new mongoose.Schema(
  {
    productID: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    itemCode: { type: String, required: true },
    itemName: { type: String, required: true },
    qty: { type: Number, required: true },
    uom: {
      type: String,
      enum: ["BOX", "CARTON", "PIECE", "DOZEN"],
      required: true
    },
    amount: { type: Number, required: true },
    rewardPerUnit: { type: Number, default: 0 },
    rewardTotal: { type: Number, default: 0 }
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    invoiceNumber: { type: String },
    invoiceDate: { type: Date, required: true },

    customerVendorCode: { type: String, required: true },
    customerVendorName: { type: String, required: true },

    items: {
      type: [InvoiceItemSchema],
      validate: [
        (items) => Array.isArray(items) && items.length > 0,
        "Invoice must have at least one item"
      ]
    },

    totalQty: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    totalReward: { type: Number, default: 0 },

    createdByRole: {
      type: String,
      enum: ["Company", "Distributor"],
      required: true
    },

    notes: { type: String },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

InvoiceSchema.index({ invoiceDate: -1 });
InvoiceSchema.index({ fromUser: 1, toUser: 1, invoiceDate: -1 });

export default mongoose.model("Invoice", InvoiceSchema);
