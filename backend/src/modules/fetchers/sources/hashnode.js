export default async function fetchHashnode({ topic = "nodejs" } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const query = `
      query GetTagPosts($slug: String!) {
        tag(slug: $slug) {
          posts(first: 4, filter: {}) {
            edges {
              node {
                title
                url
                brief
                publishedAt
              }
            }
          }
        }
      }
    `;

    const response = await fetch("https://gql.hashnode.com", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "content-fetcher/1.0",
      },
      body: JSON.stringify({
        query,
        variables: { slug: topic },
      }),
    });

    const json = await response.json();

    if (!response.ok || json.errors || !json.data?.tag) {
      if (json.errors) console.error("Hashnode API Error:", json.errors[0].message);
      return [];
    }

    const edges = json.data.tag.posts.edges;

    return edges.map((edge) => ({
      title: edge.node.title,
      url: edge.node.url,
      summary: edge.node.brief || null,
      pubDate: edge.node.publishedAt,
      raw: edge.node,
    }));
  } catch (err) {
    console.error("hashnode.fetch error:", err.message);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}