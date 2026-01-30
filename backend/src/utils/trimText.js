export function trimWords(text, maxWords = 60) {
  if (!text || typeof text !== "string") return "";

  return text
    .replace(/\s+/g, " ")
    .replace(/[#*_`>]/g, "")
    .trim()
    .split(" ")
    .slice(0, maxWords)
    .join(" ");
}
