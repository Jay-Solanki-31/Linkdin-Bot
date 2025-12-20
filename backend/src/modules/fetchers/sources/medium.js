import Parser from "rss-parser";
const parser = new Parser();

export default async function fetch({ topic = "nodejs" } = {}) {
  try {
    const feedUrl = `https://medium.com/feed/tag/${encodeURIComponent(topic)}`;
    const feed = await parser.parseURL(feedUrl);
    if (!feed || !feed.items) return [];

    return feed.items.slice(0, 8).map((it) => ({
      title: it.title,
      url: it.link,
      contentSnippet: it.contentSnippet,
      pubDate: it.pubDate,
      raw: it,
    }));
  } catch (err) {
    console.error("medium.fetch error:", err.message);
    return [];
  }
}
