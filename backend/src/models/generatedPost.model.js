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
    enum: ["draft", "queued", "posted", "failed"],
    default: "draft",
    index: true
  },

  linkedinPostUrn: String,
  postedAt: Date,
  error: String,

}, { timestamps: true });

export default mongoose.model("GeneratedPost", GeneratedPostSchema);
