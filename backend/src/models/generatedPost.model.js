// src/models/generatedPost.model.js
import mongoose from "mongoose";

const GeneratedPostSchema = new mongoose.Schema({
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FetchedContent",
    required: true,
    index: true
  },
  title: { type: String, default: "" },
  text: { type: String, required: true },
  url: { type: String },
  source: { type: String },
  status: {
    type: String,
    enum: ["pending", "draft", "completed", "failed"],
    default: "draft",
  },
}, { timestamps: true });

export default mongoose.model("GeneratedPost", GeneratedPostSchema);
