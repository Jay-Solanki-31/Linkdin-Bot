import mongoose from "mongoose";

const PostAnalyticsSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeneratedPost",
      required: true,
      index: true,
    },

    linkedinPostUrn: {
      type: String,
      required: true,
      index: true,
    },

    linkedinPostUrl: {
      type: String,
    },

    impressions: {
      type: Number,
      default: 0,
    },

    likes: {
      type: Number,
      default: 0,
    },

    comments: {
      type: Number,
      default: 0,
    },

    reposts: {
      type: Number,
      default: 0,
    },

    source: {
      type: String,
      enum: ["extension"],
      default: "extension",
    },

    collectedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PostAnalyticsSchema.index({
  linkedinPostUrn: 1,
  collectedAt: -1,
});

export default mongoose.model(
  "PostAnalytics",
  PostAnalyticsSchema
);
