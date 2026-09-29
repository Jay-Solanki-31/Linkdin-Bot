import { describe, expect, it } from "vitest";
import { filterHackerNewsDuplicates } from "../../src/modules/fetchers/filterHackerNewsDuplicates.js";

describe("filterHackerNewsDuplicates", () => {
  it("removes repeated item IDs and URLs within one fetch batch", () => {
    const first = {
      sourceItemId: "hackernews:1",
      url: "https://news.ycombinator.com/item?id=1",
    };
    const duplicateId = {
      sourceItemId: "hackernews:1",
      url: "https://example.com/story-1",
    };
    const duplicateUrl = {
      sourceItemId: "hackernews:2",
      url: "https://news.ycombinator.com/item?id=1",
    };

    expect(filterHackerNewsDuplicates([first, duplicateId, duplicateUrl], [])).toEqual({
      items: [first],
      duplicatesSkipped: 2,
    });
  });

  it("skips URLs already owned by a different source item", () => {
    const article = {
      sourceItemId: "hackernews:2",
      url: "https://example.com/shared-story",
    };

    expect(
      filterHackerNewsDuplicates([article], [
        { sourceItemId: undefined, url: article.url },
      ])
    ).toEqual({ items: [], duplicatesSkipped: 1 });
  });
});