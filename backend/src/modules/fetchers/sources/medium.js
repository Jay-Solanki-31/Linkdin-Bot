import Parser from "rss-parser";
const parser = new Parser();

export default async function fetchMedium({ topic = "programming" } = {}) {
  try {
    const feedUrl = `https://medium.com/feed/topic/${encodeURIComponent(topic)}`;
    const feed = await parser.parseURL(feedUrl);
    
    if (!feed?.items) return [];

    return feed.items.slice(0, 5).map((it) => ({
      title: it.title,
      url: it.link,
      summary: it.contentSnippet || null,
      pubDate: it.pubDate,
      raw: it,
    }));
  } catch (err) {
    console.error("medium.fetch error:", err.message);
    return [];
  }
}