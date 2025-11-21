import mongoose from "mongoose";

const ContentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Image", "Video", "Document", "News"],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number
  },
  visibleTo: {
    type: String,
    enum: ["Distributor", "Dealer", "Both"],
    default: "Both"
  },
  tags: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

// Index for better query performance
ContentSchema.index({ type: 1, visibleTo: 1, isActive: 1 });
ContentSchema.index({ uploadedBy: 1 });

export default mongoose.model("Content", ContentSchema);