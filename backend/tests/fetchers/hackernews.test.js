import { beforeEach, describe, expect, it, vi } from "vitest";

const { axiosGet, loggerError, loggerInfo, loggerWarn } = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  loggerError: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock("axios", () => ({
  default: { get: axiosGet },
}));

vi.mock("../../src/utils/logger.js", () => ({
  default: {
    error: loggerError,
    info: loggerInfo,
    warn: loggerWarn,
  },
}));

import fetchHackerNews from "../../src/modules/fetchers/sources/hackernews.js";
import FetcherService from "../../src/modules/fetchers/fetcher.service.js";

describe("Hacker News fetcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers Hacker News in place of npm without removing other active sources", () => {
    expect(FetcherService.getAvailableSources()).toEqual([
      "devto",
      "medium",
      "github",
      "hackernews",
      "nodeweekly",
      "reddit",
    ]);
  });

  it("normalizes relevant stories and uses a discussion URL for text-only stories", async () => {
    axiosGet.mockImplementation(async (url) => {
      if (url.endsWith("topstories.json")) {
        return { data: [101, 102, 103, 104] };
      }

      const id = Number(url.match(/item\/(\d+)\.json$/)[1]);
      const stories = {
        101: {
          id: 101,
          type: "story",
          title: "Node.js services need careful database boundaries",
          url: "https://example.com/node-database",
          time: 1700000000,
          score: 42,
          descendants: 18,
        },
        102: {
          id: 102,
          type: "story",
          title: "Ask HN: How do you secure backend APIs?",
          text: "I am comparing authentication approaches for Node.js APIs.",
          time: 1700000100,
          score: 12,
          descendants: 9,
        },
        103: {
          id: 103,
          type: "story",
          title: "Weekend travel ideas",
          url: "https://example.com/travel",
          time: 1700000200,
        },
        104: {
          id: 104,
          type: "story",
          title: "Node.js story marked dead",
          time: 1700000300,
          dead: true,
        },
      };

      return { data: stories[id] };
    });

    const articles = await fetchHackerNews();

    expect(articles).toHaveLength(2);
    expect(articles[0]).toMatchObject({
      title: "Node.js services need careful database boundaries",
      url: "https://example.com/node-database",
      sourceItemId: "hackernews:101",
      description: expect.stringContaining("Hacker News score: 42"),
    });
    expect(articles[0].timestamp).toEqual(new Date(1700000000 * 1000));
    expect(articles[1]).toMatchObject({
      title: "Ask HN: How do you secure backend APIs?",
      url: "https://news.ycombinator.com/item?id=102",
      sourceItemId: "hackernews:102",
      description: expect.stringContaining("Node.js APIs"),
    });
  });

  it("returns valid stories when an individual item request fails", async () => {
    axiosGet.mockImplementation(async (url) => {
      if (url.endsWith("topstories.json")) return { data: [201, 202] };
      if (url.endsWith("/item/201.json")) throw new Error("temporary network error");
      return {
        data: {
          id: 202,
          type: "story",
          title: "Backend API design tradeoffs",
          url: "https://example.com/api-design",
          time: 1700000000,
        },
      };
    });

    const articles = await fetchHackerNews();

    expect(articles).toHaveLength(1);
    expect(articles[0].sourceItemId).toBe("hackernews:202");
    expect(loggerInfo).toHaveBeenCalledWith(expect.stringContaining("errors=1"));
  });

  it("stores useful discussion comments while skipping deleted comments", async () => {
    axiosGet.mockImplementation(async (url) => {
      if (url.endsWith("topstories.json")) return { data: [301] };

      const id = Number(url.match(/item\/(\d+)\.json$/)[1]);
      const items = {
        301: {
          id: 301,
          type: "story",
          title: "PostgreSQL timestamp behavior in backend services",
          url: "https://example.com/postgres-timezones",
          time: 1700000000,
          score: 46,
          descendants: 26,
          kids: [401, 402, 403, 404],
        },
        401: {
          id: 401,
          type: "comment",
          by: "db_engineer",
          text: "The important detail is that the session timezone changes how this timestamp is interpreted.",
        },
        402: {
          id: 402,
          type: "comment",
          deleted: true,
          text: "Removed comment content should not be stored.",
        },
        403: {
          id: 403,
          type: "comment",
          text: "Use explicit timezone-aware types and test conversions at daylight saving boundaries.",
        },
      };

      if (id === 404) throw new Error("temporary comment failure");
      return { data: items[id] };
    });

    const articles = await fetchHackerNews();

    expect(articles).toHaveLength(1);
    expect(articles[0].description).toContain("session timezone changes");
    expect(articles[0].description).toContain("daylight saving boundaries");
    expect(articles[0].description).not.toContain("Removed comment content");
    expect(axiosGet).not.toHaveBeenCalledWith(
      expect.stringContaining("/item/404.json"),
      expect.anything()
    );
    expect(loggerInfo).toHaveBeenCalledWith(
      expect.stringContaining("comments=2")
    );
  });

  it("returns an empty list and logs when the top stories endpoint fails", async () => {
    axiosGet.mockRejectedValue(new Error("API unavailable"));

    await expect(fetchHackerNews()).resolves.toEqual([]);
    expect(loggerError).toHaveBeenCalledWith(
      "[hackernews.fetch] Failed to fetch top stories: API unavailable"
    );
  });
});