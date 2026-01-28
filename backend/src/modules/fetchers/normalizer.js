import { trimWords } from "../../utils/trimText.js";

export function normalizeArticle(raw, source) {
  if (!raw) return null;

  const url =
    raw.url ||
    raw.link ||
    raw.homepage ||
    raw.html_url ||
    raw.repository?.url ||
    raw.meta?.url ||
    null;

  if (!url) return null;

  const rawDescription =
    raw.description ||
    raw.summary ||
    raw.brief ||
    raw.contentSnippet ||
    raw.selftext ||
    null;

  return {
    title: (raw.title || raw.name || "Untitled").trim(),
    url: url.trim(),
    source,

    description: trimWords(rawDescription, 600), // 👈 100–150 words max

    language: raw.language || null,
    tags: raw.tags || raw.tag_list || raw.keywords || [],
    timestamp: new Date(),
    raw,
  };
}
