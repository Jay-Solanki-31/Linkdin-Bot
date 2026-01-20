import axios from "axios";
import * as cheerio from "cheerio";

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

    $("article.Box-row").slice(0, 10).each((_, el) => {
      const titleEl = $(el).find("h2 a");
      const repoPath = titleEl.attr("href");
      if (!repoPath) return;

      results.push({
        title: titleEl.text().trim().replace(/\s+/g, " "),
        url: `https://github.com${repoPath}`,
        description: $(el).find("p").text().trim() || null,
        language:
          $(el)
            .find("span[itemprop='programmingLanguage']")
            .text()
            .trim() || "Unknown",
        source: "github",
        timestamp: new Date(),
      });
    });

    return results;
  } catch (err) {
    console.error("github.fetch error:", err.message);
    return [];
  }
}
