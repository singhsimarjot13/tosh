import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema({
  userID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    unique: true 
  },

  // current balance
  balancePoints: { type: Number, default: 0 },

  // lifetime stats
  totalEarned: { type: Number, default: 0 },
  totalDebited: { type: Number, default: 0 }

}, { timestamps: true });

export default mongoose.model("Wallet", WalletSchema);
