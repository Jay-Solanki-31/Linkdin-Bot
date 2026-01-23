import Parser from "rss-parser";
const parser = new Parser();

export default async function fetchMedium({ topic = "programming" } = {}) {
  try {
    const feedUrl = `https://medium.com/feed/topic/${encodeURIComponent(topic)}`;
    console.log('feedUrl============>', feedUrl);
    const feed = await parser.parseURL(feedUrl);
    console.log('feed============>', feed);
    
    if (!feed?.items) return [];

    console.log('feed.items============>', feed.items);

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