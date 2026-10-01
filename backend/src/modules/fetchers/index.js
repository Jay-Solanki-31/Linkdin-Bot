import * as devto from "./sources/devto.js";
import * as medium from "./sources/medium.js";
import * as github from "./sources/github.js";
import fetchHackerNews from "./sources/hackernews.js";
import * as nodeweekly from "./sources/nodeweekly.js";
import * as reddit from "./sources/reddit.js";

const SOURCES = {
  devto,
  medium,
  github,
  hackernews: { fetch: fetchHackerNews },
  nodeweekly,
  reddit,
};
async function run(sourceKey, params = {}) {
  const src = SOURCES[sourceKey];
  if (!src || !src.fetch) {
    throw new Error(
      `Unknown source "${sourceKey}". Valid: ${Object.keys(SOURCES).join(", ")}`
    );
  }

  return await src.fetch(params);
}

export default { run, SOURCES };
