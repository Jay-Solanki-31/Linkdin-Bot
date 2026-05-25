import axios from "axios";
import { cleanContent } from "../../../utils/cleanContent.js";

export default async function fetchNpm() {
  try {
    const res = await axios.get(
      "https://registry.npmjs.org/-/v1/search?text=nodejs&size=5",
      {
        timeout: 10000,
        headers: {
          "User-Agent": "content-fetcher/1.0",
        },
      }
    );

    const packages = res.data.objects || [];

    const results = [];

    for (const { package: pkg } of packages) {
      try {
        if (!pkg?.name) continue;

        const metaRes = await axios.get(
          `https://registry.npmjs.org/${pkg.name}`,
          {
            timeout: 10000,
          }
        );

        const latestVersion =
          metaRes.data["dist-tags"]?.latest;

        const latest =
          metaRes.data.versions?.[latestVersion];

        const readme =
          latest?.readme ||
          pkg.description ||
          "";

        results.push({
          title: pkg.name,
          url:
            pkg.links?.npm ||
            `https://www.npmjs.com/package/${pkg.name}`,
          description: cleanContent(readme),
          tag_list: pkg.keywords || [],
          published_at:
            pkg.date ||
            new Date().toISOString(),
          raw: {
            search: pkg,
            metadata: latest,
          },
        });
      } catch (pkgErr) {
        console.error(
          "npm.package error:",
          pkgErr.message
        );
      }
    }

    return results;
  } catch (err) {
    console.error("npm.fetch error:", err.message);
    return [];
  }
}