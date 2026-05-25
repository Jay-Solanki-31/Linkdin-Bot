import { cleanContent } from "../../../utils/cleanContent.js";

export default async function fetchReddit({
  topic = "nodejs",
} = {}) {
  try {
    const url = `https://www.reddit.com/r/${encodeURIComponent(
      topic
    )}/hot.json?limit=5`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "content-fetcher/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    const posts = json?.data?.children ?? [];

    return posts.map(({ data }) => ({
      title: data.title,
      url: `https://www.reddit.com${data.permalink}`,
      description: cleanContent(
        data.selftext ||
        data.title ||
        ""
      ),
      score: data.score,
      tag_list: [topic],
      published_at: new Date(
        data.created_utc * 1000
      ).toISOString(),
      raw: data,
    }));
  } catch (err) {
    console.error("reddit.fetch error:", err.message);
    return [];
  }
}