export function detectSourceType(url) {
    if (!url) return "general";

    const value = url.toLowerCase();

    if (value.includes("reddit.com"))
        return "reddit";

    if (value.includes("github.com"))
        return "github";

    if (value.includes("npmjs.com"))
        return "npm";

    if (value.includes("dev.to"))
        return "devto";

    if (value.includes("medium.com"))
        return "medium";

    if (value.includes("hashnode.com"))
        return "hashnode";

    if (value.includes("news.ycombinator.com"))
        return "hackernews";

    if (value.includes("nodeweekly.com"))
        return "newsletter";

    return "general";
}