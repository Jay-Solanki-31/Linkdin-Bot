
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

  return {
    title: (raw.title || raw.name || "Untitled").trim(),
    url: url.trim(),
    source,
    tags: raw.tags || raw.keywords || [],
    summary: raw.summary || raw.description || null,
    fetchedAt: new Date(),
    raw,
  };
}
