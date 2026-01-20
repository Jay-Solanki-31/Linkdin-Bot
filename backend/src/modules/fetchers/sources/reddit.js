export default async function fetchReddit({ topic = "nodejs" } = {}) {
  try {
    const url = `https://www.reddit.com/r/${encodeURIComponent(topic)}/hot.json?limit=10`;

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
      summary: data.selftext?.slice(0, 300) || null,
      score: data.score,
      raw: data,
    }));
  } catch (err) {
    console.error("reddit.fetch error:", err.message);
    return [];
  }
}
