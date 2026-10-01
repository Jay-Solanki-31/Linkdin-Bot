import { describe, expect, it } from "vitest";
import { normalizeFetchedUrl } from "../../src/utils/normalizeFetchedUrl.js";

describe("normalizeFetchedUrl", () => {
  it("preserves the item ID in Hacker News discussion URLs", () => {
    expect(
      normalizeFetchedUrl(
        "https://news.ycombinator.com/item?id=123&utm_source=feed",
        "hackernews"
      )
    ).toBe("https://news.ycombinator.com/item?id=123");
  });

  it("continues removing query strings for other sources", () => {
    expect(
      normalizeFetchedUrl("https://example.com/story?ref=feed", "devto")
    ).toBe("https://example.com/story");
  });
});