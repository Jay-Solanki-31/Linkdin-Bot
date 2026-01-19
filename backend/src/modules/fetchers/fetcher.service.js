import devto from "./sources/devto.js";
import medium from "./sources/medium.js";
import fetchGithub from "./sources/github.js";
import npm from "./sources/npm.js";
// import hackernews from "./sources/hackernews.js";

class FetcherService {
    async fetchFromSource(source) { 
        switch (source) {
            case "devto":
                return devto();
            case "medium":
                return medium();
            case "github":
                return fetchGithub();
            case "npm":
                return npm();
            // case "hackernews":
            //     return hackernews();
            default:
                throw new Error("Invalid source passed to fetcher service");
        }
    }
}

export default new FetcherService();
