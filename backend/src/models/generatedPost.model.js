import mongoose from "mongoose";

const GeneratedPostSchema = new mongoose.Schema({
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FetchedContent",
    required: true,
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

GeneratedPostSchema.index({ articleId: 1 }, { unique: true });

GeneratedPostSchema.index(
  { linkedinPostUrn: 1 },
  { unique: true, sparse: true }
);


export default mongoose.model("GeneratedPost", GeneratedPostSchema);

