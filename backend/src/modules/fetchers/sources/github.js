
import axios from "axios";
import * as cheerio from "cheerio";

export default async function github() {
    try {
        const trendingUrl = "https://github.com/trending/javascript?since=daily";

        const response = await axios.get(trendingUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const results = [];

        $("article.Box-row").each((_, el) => {
            const titleEl = $(el).find("h2 a");
            const repoPath = titleEl.attr("href");
            
            if (!repoPath) return;            

            const repoName = titleEl.text().trim().replace(/\s+/g, " ");
            const repoUrl = `https://github.com${repoPath}`;
            const repoDescription =
                $(el).find("p").text().trim() ||
                $(el).find("p[class*='color-text-secondary']").text().trim();

            const repoLanguage = $(el)
                .find("span[itemprop='programmingLanguage']")
                .text()
                .trim();

            results.push({
                title: repoName,
                url: repoUrl,
                description: repoDescription,
                language: repoLanguage || "Unknown",
                source: "github",
                timestamp: new Date()
            });
        });

        console.log(`GitHub Fetcher ✔️ Found: ${results.length} repos`);
        return results;

    } catch (err) {
        console.error("❌ GitHub fetch error:", err.message);
        return [];
    }
}
