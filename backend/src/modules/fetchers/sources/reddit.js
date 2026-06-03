import Parser from "rss-parser";
import { extractBestContent } from "../../../utils/extractBestContent.js";

const parser = new Parser();

export default async function fetchReddit({
  topic = "node",
} = {}) {
  try {
    const url = `https://www.reddit.com/r/${encodeURIComponent(
      topic
    )}/hot.rss`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FeedFetcher-Google; +http://www.google.com/feedfetcher.html)",

        Accept:
          "application/rss+xml, application/atom+xml, text/xml",
      },
    });

    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status} ${res.statusText}`
      );
    }

    const xmlText = await res.text();

    const feed = await parser.parseString(xmlText);

    const posts = feed.items || [];

    return posts.slice(0, 5).map((item) => {
      const textBody =
        item.content ||
        item.summary ||
        item.contentSnippet ||
        item.title ||
        "";

      return {
        title: item.title,

        url: item.link || "",

        description: extractBestContent(
          textBody,
          item.contentSnippet,
          item.summary,
          item.title
        ),

        score: 0,

        raw: item,
      };
    });
  } catch (err) {
    console.error(
      "reddit.fetch error:",
      err.message
    );

    return [];
  }
}