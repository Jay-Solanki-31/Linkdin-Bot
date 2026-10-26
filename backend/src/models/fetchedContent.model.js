import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    linkedinMemberUrn: { type: String, index: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    description: { type: String, default: "" },
    language: { type: String, default: null },
    source: { type: String, default: null },
    sourceItemId: { type: String, default: undefined },
    timestamp: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      default: () =>
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  },
  { timestamps: true }
);

// TTL index
schema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

schema.index(
  { linkedinMemberUrn: 1, url: 1 },
  { unique: true, partialFilterExpression: { linkedinMemberUrn: { $type: "string" } } }
);
schema.index(
  { linkedinMemberUrn: 1, sourceItemId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      linkedinMemberUrn: { $type: "string" },
      sourceItemId: { $type: "string" },
    },
  }
);

export default mongoose.models.FetchedContent || mongoose.model("FetchedContent", schema);
