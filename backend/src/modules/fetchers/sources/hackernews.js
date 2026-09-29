import axios from "axios";
import { cleanContent } from "../../../utils/cleanContent.js";
import logger from "../../../utils/logger.js";

const API_BASE = "https://hacker-news.firebaseio.com/v0";
const STORY_LIMIT = 30;
const STORY_CONCURRENCY = 5;
const COMMENT_STORY_LIMIT = 8;
const STORY_COMMENT_LIMIT = 3;
const COMMENT_TEXT_LIMIT = 500;
const RELEVANT_CONTENT = /\b(node(?:\.js)?|javascript|typescript|backend|back-end|database|postgres(?:ql)?|mysql|mongodb|redis|api|infrastructure|security|server|cloud|devops|open source|developer tools?|programming|software|engineering|distributed systems|http|web performance|compiler|runtime|linux|docker|kubernetes)\b/i;
const PROMOTIONAL_TITLE = /^(show hn:|i built\b|launching\b)/i;

function isRelevantStory(story) {
  const content = `${story.title || ""} ${story.text || ""}`;
  return RELEVANT_CONTENT.test(content) && !PROMOTIONAL_TITLE.test(story.title || "");
}

function normalizeStory(story, comments = []) {
  const fallbackUrl = `https://news.ycombinator.com/item?id=${story.id}`;
  let url = fallbackUrl;

  if (story.url) {
    try {
      const candidate = new URL(story.url);
      if (candidate.protocol === "http:" || candidate.protocol === "https:") {
        url = candidate.toString();
      }
    } catch {
      url = fallbackUrl;
    }
  }

  const text = cleanContent(story.text || "");
  const discussion = comments
    .map(({ by, text: commentText }) => {
      const author = by ? ` by ${by}` : "";
      return `- Comment${author}: ${commentText.slice(0, COMMENT_TEXT_LIMIT)}`;
    })
    .join("\n");
  const details = [
    text ? `Story text: ${text}` : "",
    discussion ? `Hacker News discussion:\n${discussion}` : "",
    Number.isFinite(Number(story.score)) ? `Hacker News score: ${story.score}` : "",
    Number.isFinite(Number(story.descendants)) ? `Comments: ${story.descendants}` : "",
  ].filter(Boolean);

  return {
    title: story.title.trim(),
    url,
    description: cleanContent(details.join("\n\n")),
    sourceItemId: `hackernews:${story.id}`,
    timestamp: new Date(story.time * 1000),
  };
}

async function fetchStory(id) {
  try {
    const response = await axios.get(`${API_BASE}/item/${id}.json`, {
      timeout: 10000,
    });
    return response.data;
  } catch {
    return null;
  }
}

async function fetchStoryComments(story) {
  const commentIds = Array.isArray(story.kids)
    ? story.kids.slice(0, STORY_COMMENT_LIMIT)
    : [];
  const results = await Promise.all(commentIds.map(fetchStory));
  const comments = results
    .filter(
      (comment) =>
        comment &&
        comment.type === "comment" &&
        !comment.deleted &&
        !comment.dead &&
        typeof comment.text === "string"
    )
    .map((comment) => ({
      by: comment.by,
      text: cleanContent(comment.text),
    }))
    .filter((comment) => comment.text.length >= 30);

  return {
    comments,
    errors: results.filter((comment) => comment === null).length,
  };
}

export default async function fetchHackerNews() {
  let ids;

  try {
    const response = await axios.get(`${API_BASE}/topstories.json`, {
      timeout: 10000,
    });
    ids = Array.isArray(response.data)
      ? response.data
          .slice(0, STORY_LIMIT)
          .filter((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0)
      : [];
  } catch (error) {
    logger.error(`[hackernews.fetch] Failed to fetch top stories: ${error.message}`);
    return [];
  }

  if (!ids.length) {
    logger.warn("[hackernews.fetch] No top story IDs returned");
    return [];
  }

  const stories = [];
  let errors = 0;

  for (let start = 0; start < ids.length; start += STORY_CONCURRENCY) {
    const batch = await Promise.all(ids.slice(start, start + STORY_CONCURRENCY).map(fetchStory));
    for (const story of batch) {
      if (story === null) errors += 1;
      if (story) stories.push(story);
    }
  }

  const validStories = stories.filter((story) => {
    const timestamp = Number(story.time);
    return (
      story.type === "story" &&
      !story.deleted &&
      !story.dead &&
      Number.isSafeInteger(Number(story.id)) &&
      Number(story.id) > 0 &&
      typeof story.title === "string" &&
      story.title.trim().length > 0 &&
      Number.isFinite(timestamp) &&
      timestamp > 0 &&
      isRelevantStory(story)
    );
  });

  const commentsByStoryId = new Map();
  let commentErrors = 0;

  for (
    let start = 0;
    start < Math.min(validStories.length, COMMENT_STORY_LIMIT);
    start += STORY_CONCURRENCY
  ) {
    const batch = validStories.slice(start, start + STORY_CONCURRENCY);
    const results = await Promise.all(batch.map(fetchStoryComments));
    results.forEach((result, index) => {
      commentsByStoryId.set(batch[index].id, result.comments);
      commentErrors += result.errors;
    });
  }

  const articles = validStories.map((story) =>
    normalizeStory(story, commentsByStoryId.get(story.id) || [])
  );
  const commentCount = [...commentsByStoryId.values()].reduce(
    (count, comments) => count + comments.length,
    0
  );
  logger.info(
    `[hackernews.fetch] stories=${ids.length}, details=${stories.length}, valid=${articles.length}, comments=${commentCount}, skipped=${stories.length - articles.length}, errors=${errors + commentErrors}`
  );
  return articles;
}