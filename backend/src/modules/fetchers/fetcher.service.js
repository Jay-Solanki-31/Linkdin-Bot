import fetchDevto from "./sources/devto.js";
import fetchGithub from "./sources/github.js";
import fetchMedium from "./sources/medium.js";
import fetchNodeweekly from "./sources/nodeweekly.js";
import fetchHackerNews from "./sources/hackernews.js";
import fetchReddit from "./sources/reddit.js";

class FetcherService {
  async fetchFromSource(source, params = {}) {
    switch (source) {
      case "devto":
        return fetchDevto(params);

      case "medium":
        return fetchMedium(params);

      case "github":
        return fetchGithub(params);

      case "hackernews":
        return fetchHackerNews(params);

      case "nodeweekly":
        return fetchNodeweekly(params);

      case "reddit":
        return fetchReddit(params);

      default:
        throw new Error(
          "Invalid source passed to fetcher service"
        );
    }
  }

  getAvailableSources() {
    return [
      "devto",
      "medium",
      "github",
      "hackernews",
      "nodeweekly",
      "reddit",
    ];
  }
}

export default new FetcherService();