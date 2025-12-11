// src/modules/fetchers/sources/npm.js

import axios from "axios";
export default async function fetchNpm() {
  try {
    const res = await axios.get("https://registry.npmjs.org/-/v1/search?text=nodejs&size=10", { timeout: 10000 });
    const results = res.data.objects || [];
    return results.map((obj) => {
      const pkg = obj.package || {};
      return {
        title: pkg.name || "unnamed",
        url: pkg.links?.npm || pkg.repository?.url || pkg.links?.homepage || null,
        summary: pkg.description || null,
        tags: pkg.keywords || [],
      };
    });
  } catch (err) {
    console.error("NPM fetch error:", err.message);
    return [];
  }
}
