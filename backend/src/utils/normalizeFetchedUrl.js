export function normalizeFetchedUrl(url, source) {
  try {
    const normalized = new URL(url);

    if (
      source === "hackernews" &&
      normalized.hostname === "news.ycombinator.com" &&
      normalized.pathname === "/item"
    ) {
      const itemId = normalized.searchParams.get("id");
      normalized.search = itemId ? `?id=${encodeURIComponent(itemId)}` : "";
    } else {
      normalized.search = "";
    }

    return normalized.toString();
  } catch {
    return url;
  }
}