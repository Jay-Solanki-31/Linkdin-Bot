import Parser from "rss-parser";
const parser = new Parser();

export default async function fetchNodeweekly() {
  try {
    const feed = await parser.parseURL("https://nodeweekly.com/rss");

    if (!Array.isArray(feed?.items)) return [];

    return feed.items.slice(0, 4).map((it) => ({
      title: it.title,
      url: it.link,
      summary: it.contentSnippet || null,
      pubDate: it.pubDate,
      raw: it,
    }));
  } catch (err) {
    console.error("nodeweekly.fetch error:", err.message);
    return [];
  }
}
