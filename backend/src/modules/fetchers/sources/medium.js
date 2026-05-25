import Parser from "rss-parser";
import { cleanContent } from "../../../utils/cleanContent.js";

const parser = new Parser();

export default async function fetchMedium({
  topic = "javascript",
} = {}) {
  try {
    const feedUrl = `https://medium.com/feed/topic/${encodeURIComponent(
      topic
    )}`;

    const feed = await parser.parseURL(feedUrl);

    if (!feed?.items) return [];

    return feed.items.slice(0, 5).map((it) => ({
      title: it.title,
      url: it.link,
      description: cleanContent(
        it["content:encoded"] ||
        it.content ||
        it.contentSnippet ||
        ""
      ),
      published_at: it.pubDate,
      raw: it,
    }));
  } catch (err) {
    console.error("medium.fetch error:", err.message);
    return [];
  }
}