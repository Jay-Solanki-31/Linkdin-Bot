import Preferences from "../models/aiWritingPreferences.model.js";
import { validatePreferences } from "../utils/writingPreferences.js";

export async function loadWritingPreferences(memberUrn) {
  if (!memberUrn) throw new Error("Missing verified account");
  const document = await Preferences.findById(memberUrn).lean();
  return document ? validatePreferences(document.preferences) : null;
}
