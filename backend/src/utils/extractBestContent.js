import { cleanContent } from "./cleanContent.js";

export function extractBestContent(...sources) {
  for (const source of sources) {
    if (
      source &&
      typeof source === "string" &&
      cleanContent(source).length > 80
    ) {
      return cleanContent(source);
    }
  }

  return "";
}