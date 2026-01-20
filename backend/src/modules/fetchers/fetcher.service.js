import fetchDailydev from "./sources/dailydev.js";
import fetchDevto from "./sources/devto.js";
import github from "./sources/github.js";
import fetchHashnode from "./sources/hashnode.js";
import fetchMedium from "./sources/medium.js";
import fetchNodeweekly from "./sources/nodeweekly.js";
import fetchNpm from "./sources/npm.js";
import fetchReddit from "./sources/reddit.js";


class FetcherService {
  async fetchFromSource(source, params = {}) {
    switch (source) {
      case "devto":
        return fetchDevto(params);
      case "medium":
        return fetchMedium(params);
      case "github":
        return github(params);
      case "npm":
        return fetchNpm(params);
      case "hashnode":
        return fetchHashnode(params);
      case "nodeweekly":
        return fetchNodeweekly(params);
      case "reddit":
        return fetchReddit(params);
      case "dailydev":
        return fetchDailydev(params);
      default:
        throw new Error("Invalid source passed to fetcher service");
    }
  }

  // Get list of available sources
  getAvailableSources() {
    return ["devto", "medium", "github", "npm", "hashnode", "nodeweekly", "reddit", "dailydev",];
  }
}

export default new FetcherService();
