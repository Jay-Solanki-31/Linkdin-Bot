import axios from "axios";
import { cleanContent } from "../../../utils/cleanContent.js";

export default async function fetchNpm() {
  try {
    const res = await axios.get(
      "https://registry.npmjs.org/-/v1/search?text=nodejs&size=5",
      {
        timeout: 15000,
      }
    );

    return (res.data.objects || []).map(({ package: pkg }) => ({
      title: pkg?.name,

      url: pkg?.links?.npm || null,

      description: cleanContent(`
        ${pkg?.description || ""}

        Keywords:
        ${(pkg?.keywords || []).join(", ")}

        Version:
        ${pkg?.version || "Unknown"}
      `),

      tags: pkg?.keywords || [],
    }));
  } catch (err) {
    console.error("npm.fetch error:", err.message);
    return [];
  }
}