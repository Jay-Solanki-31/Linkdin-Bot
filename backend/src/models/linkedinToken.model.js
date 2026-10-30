import mongoose from "mongoose";

const LinkedInTokenSchema = new mongoose.Schema({
  accountId: {
    type: String,
    required: true,
  },

  accessToken: {
    type: String,
    required: true,
  },

  memberUrn: {
    type: String,
    required: true,
    unique: true,
  },
  
  expiresAt: {
    type: Date,
    required: true,
  },

  automationEnabled: { type: Boolean, default: true },
  timezone: { type: String, default: "Asia/Kolkata" },
  memberId: String,
  profileName: String,
  displayName: String,
  givenName: String,
  familyName: String,
  profilePicture: String,
  profileUpdatedAt: Date,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

LinkedInTokenSchema.index({ accountId: 1, memberUrn: 1 }, { unique: true });

LinkedInTokenSchema.pre("save", function () {
  this.updatedAt = new Date();
});

export default mongoose.models.LinkedInToken || mongoose.model("LinkedInToken", LinkedInTokenSchema);
