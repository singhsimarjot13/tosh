import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  role: { 
    type: String, 
    enum: ["Company", "Distributor", "Dealer"], 
    required: true 
  },
  name: { type: String, required: true },
  mobile: { type: String, unique: true, sparse: true },
  address: { type: String },
  
  // Hierarchy relationships
  distributorID: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // For dealers only
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who created this user
  bpCode: { type: String},          // BP Code
  bpName: { type: String },          // BP Name     // Mobile Phone
  billToState: { type: String },             // Bill-to State
  // Authentication fields
  username: { type: String, unique: true, sparse: true }, // For Company login
  password: { type: String }, // Hashed password
  
  // Status
  isActive: { type: Boolean, default: true },
  
  // Dealer reward cap set by distributor (max distributor can transfer per invoice)
  dealerRewardLimit: { type: Number, default: 0 }
  
}, { timestamps: true });

// Index for better query performance
UserSchema.index({ role: 1, distributorID: 1 });
UserSchema.index({ createdBy: 1 });

export default mongoose.model("User", UserSchema);
