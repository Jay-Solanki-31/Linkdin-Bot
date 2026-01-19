
import * as devto from "./sources/devto.js";
// import * as hackernews from "./sources/hackernews.js";
import * as medium from "./sources/medium.js";
import * as github from "./sources/github.js";
import * as npmSource from "./sources/npm.js";


const SOURCES = {
  devto,
  medium,
  github,
  npm: npmSource,
  // hackernews,ubbu
};

async function run(sourceKey, params = {}) {
  const src = SOURCES[sourceKey];
  if (!src || !src.fetch) {
    throw new Error(`Unknown source "${sourceKey}". Valid: ${Object.keys(SOURCES).join(", ")}`);
  }

  return await src.fetch(params);
}

export default { run, SOURCES };
