export function detectSourceType(url) {
    if (!url) return "general";

    const value = url.toLowerCase();

    if (value.includes("reddit.com"))
        return "reddit";

    if (value.includes("github.com"))
        return "github";

    if (value.includes("npmjs.com"))
        return "npm";

    if (
        value.includes("dev.to") ||
        value.includes("medium.com")
    )
        return "article";

    if (
        value.includes("nodeweekly.com")
    )
        return "newsletter";

    return "general";
}