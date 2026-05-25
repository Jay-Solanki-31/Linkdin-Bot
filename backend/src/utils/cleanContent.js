export function cleanContent(text = "", max = 2000) {
  return text
    ?.replace(/<[^>]*>/g, " ")
    ?.replace(/[#>*`]/g, "")
    ?.replace(/\s+/g, " ")
    ?.trim()
    ?.slice(0, max);
}