export function cleanContent(text = "") {
  if (!text || typeof text !== "string") return "";

  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/&[#A-Za-z0-9]+;/g, " ")
    .replace(/\b(Read more|Continue reading|View original)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
}