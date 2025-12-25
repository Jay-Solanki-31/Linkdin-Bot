import mongoose from "mongoose";

const LinkedInTokenSchema = new mongoose.Schema({
  _accessToken: {
    type: String,
    required: true,
  },
  get accessToken() {
    return this._accessToken;
  },
  set accessToken(value) {
    this._accessToken = value;
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
