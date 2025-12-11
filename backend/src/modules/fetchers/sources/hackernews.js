// src/modules/fetchers/sources/hackernews.js
import axios from "axios";
export default async function fetchHN() {
  try {
    const q = encodeURIComponent("node"); 
    const url = `https://hn.algolia.com/api/v1/search?query=${q}&hitsPerPage=20`;
    const res = await axios.get(url, { timeout: 10000 });
    const hits = Array.isArray(res.data.hits) ? res.data.hits : [];

    return hits
      .filter(Boolean)
      .slice(0, 10)
      .map((h) => ({
        title: h.title || h.story_title || "Untitled",
        url: h.url || (h.story_url) || `https://news.ycombinator.com/item?id=${h.objectID}`,
        summary: h._highlightResult?.comment_text?.value || null,
        tags: h._tags || [],
      }));
  } catch (err) {
    console.error("HackerNews fetch error:", err.message);
    return [];
  }
}
