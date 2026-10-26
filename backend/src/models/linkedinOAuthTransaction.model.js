import mongoose from "mongoose";

const LinkedInOAuthTransactionSchema = new mongoose.Schema(
  {
    stateHash: {
      type: String,
      required: true,
      unique: true
    },
    accountId: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { versionKey: false }
);

LinkedInOAuthTransactionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.models.LinkedInOAuthTransaction || mongoose.model(
  "LinkedInOAuthTransaction",
  LinkedInOAuthTransactionSchema
);
