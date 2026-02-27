import * as devto from "./sources/devto.js";
import * as medium from "./sources/medium.js";
import * as github from "./sources/github.js";
import * as npmSource from "./sources/npm.js";
import * as hashnode from "./sources/hashnode.js";
import * as nodeweekly from "./sources/nodeweekly.js";
import * as reddit from "./sources/reddit.js";

const SOURCES = {
  devto,
  medium,
  github,
  npm: npmSource,
  hashnode,
  nodeweekly,
  reddit,
};
//  needd hackernews add in sources 
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
