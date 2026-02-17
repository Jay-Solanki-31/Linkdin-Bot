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
    enum: ["draft", "generating", "queued", "publishing", "posted", "failed"],
    default: "draft",
    index: true
  },
  slot: String,
  linkedinPostUrn: String,
  postedAt: Date,
  error: String,
  attempts: { type: Number, default: 0 },
  lastAttemptAt: Date,
  publishAt: Date

}, { timestamps: true });

GeneratedPostSchema.index({ articleId: 1 }, { unique: true });

GeneratedPostSchema.index(
  { linkedinPostUrn: 1 },
  { unique: true, sparse: true }
);

GeneratedPostSchema.index({ slot: 1, status: 1 });
GeneratedPostSchema.index({ publishAt: 1 });


export default mongoose.model("GeneratedPost", GeneratedPostSchema);

