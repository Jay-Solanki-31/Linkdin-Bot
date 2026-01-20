export default async function fetchHashnode({ topic = "nodejs" } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("https://gql.hashnode.com", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "content-fetcher/1.0",
      },
      body: JSON.stringify({
        query: `
          query ($tag: String!) {
            tag(slug: $tag) {
              posts(page: 1, pageSize: 8) {
                nodes {
                  title
                  url
                  brief
                  publishedAt
                }
              }
            }
          }
        `,
        variables: { tag: topic },
      }),
    });

    const json = await response.json();

    if (!response.ok || json.errors) return [];

    return (
      json?.data?.tag?.posts?.nodes?.map((it) => ({
        title: it.title,
        url: it.url,
        summary: it.brief || null,
        pubDate: it.publishedAt,
        raw: it,
      })) || []
    );
  } catch (err) {
    console.error("hashnode.fetch error:", err.message);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
