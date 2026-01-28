export function trimWords(text, maxWords = 120) {
  if (!text || typeof text !== "string") return null;

  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, maxWords)
    .join(" ");
}
