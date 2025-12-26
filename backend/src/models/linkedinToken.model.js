import mongoose from "mongoose";

const LinkedInTokenSchema = new mongoose.Schema({
  accessToken: {
    type: String,
    required: true,
  },

  expiresAt: {
    type: Date,
    required: true,
  },

  memberId: {
    type: String,
  },

  profileName: {
    type: String,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

LinkedInTokenSchema.pre("save", function () {
  this.updatedAt = new Date();
});

export default mongoose.model("LinkedInToken", LinkedInTokenSchema);
