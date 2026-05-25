import axios from "axios";
import * as cheerio from "cheerio";
import { cleanContent } from "../../../utils/cleanContent.js";

export default async function fetchGithub() {
  try {
    const trendingUrl =
      "https://github.com/trending/javascript?since=daily";

    const response = await axios.get(trendingUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const results = [];

    const repos = $("article.Box-row").slice(0, 5).toArray();

    for (const el of repos) {
      try {
        const titleEl = $(el).find("h2 a");
        const repoPath = titleEl.attr("href");

        if (!repoPath) continue;

        const repoUrl = `https://github.com${repoPath}`;

        const repoRes = await axios.get(repoUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0",
          },
          timeout: 10000,
        });

        const repoPage = cheerio.load(repoRes.data);

        const readmeText = repoPage
          $("#readme")
          .text()
          .trim();

        results.push({
          title: titleEl.text().trim().replace(/\s+/g, " "),
          url: repoUrl,
          description: cleanContent(
            readmeText ||
            $(el).find("p").text().trim() ||
            ""
          ),
          language:
            $(el)
              .find("span[itemprop='programmingLanguage']")
              .text()
              .trim() || "Unknown",

          source: "github",
          timestamp: new Date(),
        });
      } catch (repoErr) {
        console.error("github.repo error:", repoErr.message);
      }
    }

    return results;
  } catch (err) {
    console.error("github.fetch error:", err.message);
    return [];
  }
}