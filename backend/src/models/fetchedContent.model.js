import mongoose from "mongoose";

const schema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, unique: true, required: true, index: true },
  description: { type: String, default: "" },
  language: { type: String, default: null },
  source: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },

  status: {
    type: String,
    enum: ["fetched", "selected", "generated", "posted", "expired"],
    default: "fetched",
  },

  slot: { type: String, default: null },

  expiresAt: { type: Date, index: true },

  aiGenerated: { type: Boolean, default: false },
  isQueued: { type: Boolean, default: false },

  processing: { type: Boolean, default: false },
  processingAt: { type: Date, default: null },

  aiError: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model("FetchedContent", schema);
