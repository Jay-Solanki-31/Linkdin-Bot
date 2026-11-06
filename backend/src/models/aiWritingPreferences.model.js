import mongoose from "mongoose";
import { OPTIONS } from "../utils/writingPreferences.js";

export const preferencesSchema = new mongoose.Schema(
  {
    tone: { type: String, enum: OPTIONS.tone, required: true },
    length: { type: String, enum: OPTIONS.length, required: true },
    emoji: { type: String, enum: OPTIONS.emoji, required: true },
    hashtags: { type: Boolean, required: true },
    language: { type: String, enum: OPTIONS.language, required: true },
    topics: {
      type: [{ type: String, maxlength: 80 }],
      validate: (v) => v.length <= 10,
    },
    customInstructions: { type: String, maxlength: 2000 },
  },
  { _id: false, strict: "throw" },
);
// Account identity is the primary key
const schema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    preferences: { type: preferencesSchema, required: true },
    revision: { type: Number, default: 1, required: true },
  },
  { timestamps: true, strict: "throw" },
);
export default mongoose.models.AIWritingPreferences ||
  mongoose.model("AIWritingPreferences", schema);
