import axios from "axios";

export default async function fetchNpm() {
  try {
    const res = await axios.get(
      "https://registry.npmjs.org/-/v1/search?text=nodejs&size=10",
      { timeout: 10000 }
    );

    return (res.data.objects || []).map(({ package: pkg }) => ({
      title: pkg?.name,
      url: pkg?.links?.npm || null,
      summary: pkg?.description || null,
      tags: pkg?.keywords || [],
    }));
  } catch (err) {
    console.error("npm.fetch error:", err.message);
    return [];
  }
}
