import Parser from "rss-parser";
import { cleanContent } from "../../../utils/cleanContent.js";

const parser = new Parser();

export default async function fetchNodeweekly() {
  try {
    const feed = await parser.parseURL(
      "https://nodeweekly.com/rss"
    );

    return feed.items.slice(0, 5).map((it) => {
      let content =
        it.contentSnippet ||
        it.content ||
        "";

      content = content
        .replace(/sponsor/gi, " ")
        .replace(/advertisement/gi, " ")
        .replace(/\s+/g, " ");

      return {
        title: it.title,
        url: it.link,

        description: cleanContent(content),

        pubDate: it.pubDate,
        raw: it,
      };
    });
  } catch (err) {
    console.error("nodeweekly.fetch error:", err.message);
    return [];
  }
}