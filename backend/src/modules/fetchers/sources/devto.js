import axios from "axios";

export default async function fetch({ topic = "node" } = {}) {
  try {
    const url = `https://dev.to/api/articles?tag=${encodeURIComponent(topic)}&per_page=10`;
    const res = await axios.get(url, { timeout: 10000 });
    return (res.data || []).map((item) => ({
      title: item.title,
      url: item.url,
      description: item.description || item.body_markdown?.slice(0, 300) || "",
      tag_list: item.tag_list || [],
      published_at: item.published_at,
      raw: item,
    }));
  } catch (err) {
    console.error("devto.fetch error:", err.message);
    return [];
  }
}
