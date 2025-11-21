import mongoose from "mongoose";

const WalletTransactionSchema = new mongoose.Schema({
  userID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  // Credit or Debit
  type: { 
    type: String, 
    enum: ["Credit", "Debit"], 
    required: true 
  },

  // Number of points added/removed
  points: { type: Number, required: true },

  // Store invoice reference if points came from invoice
  sourceInvoiceID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Invoice" 
  },

  // NEW: store what rule was used (Piece / Amount)
  pointsMode: { 
    type: String, 
    enum: ["PIECE", "AMOUNT", "MANUAL", "TRANSFER"], 
    default: "MANUAL" 
  },

  // NEW: Log before & after balance
  balanceBefore: { type: Number },
  balanceAfter: { type: Number },

  // OPTIONAL NOTE (Manual/Transfer cases)
  note: { type: String },

  // Who performed the transaction
  performedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },

  date: { type: Date, default: Date.now }
});

WalletTransactionSchema.index({ userID: 1 });

export default mongoose.model("WalletTransaction", WalletTransactionSchema);
