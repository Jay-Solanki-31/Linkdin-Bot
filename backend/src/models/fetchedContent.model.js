import mongoose from "mongoose";

const schema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, unique: true, required: true },
  description: { type: String, default: "" },
  language: { type: String, default: null },
  source: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
  expiresAt: { type: Date }
}, { timestamps: true });

schema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.model("FetchedContent", schema);
