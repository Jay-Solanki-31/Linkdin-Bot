import Parser from "rss-parser";
import { cleanContent } from "../../../utils/cleanContent.js";

const parser = new Parser();

export default async function fetchNodeweekly() {
  try {
    const feed = await parser.parseURL(
      "https://nodeweekly.com/rss"
    );

    return feed.items.slice(0, 4).map((it) => ({
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
    console.error("nodeweekly.fetch error:", err.message);
    return [];
  }
}