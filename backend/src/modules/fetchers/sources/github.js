import axios from "axios";
import * as cheerio from "cheerio";
import { cleanContent } from "../../../utils/cleanContent.js";

export default async function fetchGithub() {
  try {
    const trendingUrl =
      "https://github.com/trending/javascript?since=daily";

    const response = await axios.get(trendingUrl, {
      timeout: 40000,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(response.data);

    const results = [];

    $("article.Box-row")
      .slice(0, 5)
      .each((_, el) => {
        const titleEl = $(el).find("h2 a");

        const repoPath = titleEl.attr("href");

        if (!repoPath) return;

        const description =
          $(el).find("p").text().trim() || "";

        const language =
          $(el)
            .find("span[itemprop='programmingLanguage']")
            .text()
            .trim() || "Unknown";

        const stars =
          $(el)
            .find("a[href$='/stargazers']")
            .text()
            .trim() || "0";

        const topics = [];

        $(el)
          .find("a.topic-tag")
          .each((_, topic) => {
            topics.push($(topic).text().trim());
          });

        results.push({
          title: titleEl.text().replace(/\s+/g, " ").trim(),

          url: `https://github.com${repoPath}`,

          description: cleanContent(`
            ${description}

            Language: ${language}

            Topics: ${topics.join(", ")}

            Stars: ${stars}
          `),

          language,
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