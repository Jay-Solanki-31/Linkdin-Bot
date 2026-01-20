import Parser from "rss-parser";
const parser = new Parser();

export default async function fetchDailydev() {
  try {
    const feedUrl =
      "https://rsshub.app/daily/popular/keyword/Node,JavaScript,Backend";

    const feed = await parser.parseURL(feedUrl);

    if (!Array.isArray(feed?.items)) return [];

    return feed.items.slice(0, 8).map((it) => ({
      title: it.title,
      url: it.link,
      summary: it.contentSnippet || null,
      pubDate: it.pubDate,
      raw: it,
    }));
  } catch (err) {
    console.error("dailydev.fetch error:", err.message);
    return [];
  }
}
