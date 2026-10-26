import mongoose from "mongoose";

const GeneratedPostSchema = new mongoose.Schema({
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FetchedContent",
    required: function () { return this.creationMode !== "manual"; },
  },
  linkedinMemberUrn: {
    type: String,
    index: true,
  },
  // Manual Thunder Client runs set this to prevent real LinkedIn publishing.
  testMode: { type: Boolean, default: false, index: true },

  creationMode: { type: String, enum: ["automatic", "manual"], default: "automatic" },
  topic: String,
  customPrompt: String,
  timezone: { type: String, default: "Asia/Kolkata" },
  scheduleVersion: { type: Number, default: 0 },
  publishAttemptedAt: Date,
  attempts: { type: Number, default: 0 },
  title: { type: String, default: "" },
  text: { type: String },
  imagePrompt: {
    type: String,
    default: ""
  },

  imagePath: {
    type: String,
    default: ""
  },

  imageUrl: {
    type: String,
    default: ""
  },

  imageStatus: {
    type: String,
    enum: [
      "pending",
      "generated",
      "uploaded",
      "failed"
    ],
    default: "pending"
  },
  url: { type: String },
  source: { type: String },
  status: {
    type: String,
    enum: ["draft", "generating", "queued", "publishing", "posted", "failed", "review_required"],
    default: "draft",
    index: true
  },
  slot: String,
  linkedinPostUrn: String,
  linkedinPostUrl: String,
  postedAt: Date,
  error: {type: String},
  recoveryAttempts: {
  type: Number,
  default: 0,
  },
  lastFailedAt: {
    type: Date,
  },
  
  promptType: {
    type: String,
    enum:[
    "insight",
    "contrarian",
    "prediction",
    "lessons"
    ],
    default: "insight"
  },
  sourceType: {
    type: String,
    default: "general",
  },
  failedStage: {
    type: String,
  },
  publishAt: Date,
  expiresAt: {
  type: Date
  }

}, { timestamps: true });

GeneratedPostSchema.index(
  { articleId: 1, linkedinMemberUrn: 1 },
  {
    unique: true,
    partialFilterExpression: { linkedinMemberUrn: { $type: "string" }, articleId: { $type: "objectId" } },
  }
);

GeneratedPostSchema.index(
  { linkedinPostUrn: 1 },
  {
    unique: true,
    partialFilterExpression: {
      linkedinPostUrn: { $type: "string" }
    }
  }
);

GeneratedPostSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

GeneratedPostSchema.index({ slot: 1, status: 1 });
GeneratedPostSchema.index({ publishAt: 1 });
GeneratedPostSchema.index({ status: 1, linkedinPostUrn: 1});


export default mongoose.models.GeneratedPost || mongoose.model("GeneratedPost", GeneratedPostSchema);

