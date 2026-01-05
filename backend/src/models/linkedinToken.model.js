import mongoose from "mongoose";

const LinkedInTokenSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: "linkedin_app_token",
  },

  accessToken: {
    type: String,
    required: true,
  },

  expiresAt: {
    type: Date,
    required: true,
  },

  memberId: String,
  profileName: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

LinkedInTokenSchema.pre("save", function () {
  this.updatedAt = new Date();
});

export default mongoose.model("LinkedInToken", LinkedInTokenSchema);
