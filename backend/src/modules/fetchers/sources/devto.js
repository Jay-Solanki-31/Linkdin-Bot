import axios from "axios";

export default async function fetchDevto({ topic = "node" } = {}) {
  try {
    const url = `https://dev.to/api/articles?tag=${encodeURIComponent(
      topic
    )}&per_page=5`;

    const res = await axios.get(url, {
      timeout: 10000,
      headers: { "User-Agent": "content-fetcher/1.0" },
    });

    return (res.data || []).map((item) => ({
      title: item.title,
      url: item.url,
      description:
        item.description ||
        item.body_markdown?.slice(0, 300) ||
        null,
      tag_list: item.tag_list || [],
      published_at: item.published_at,
      raw: item,
    }));
  } catch (err) {
    console.error("devto.fetch error:", err.message);
    return [];
  }
}
