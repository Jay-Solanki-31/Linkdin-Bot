import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import connectDB from "../../config/db.js";
import fetcherService from "../../modules/fetchers/fetcher.service.js";
import FetchedContent from "../../models/fetchedContent.model.js";
import { normalizeArticle } from "../../modules/fetchers/normalizer.js";
import logger from "../../utils/logger.js";

await connectDB();

const worker = new Worker(
  "fetcher-queue",
  async (job) => {
    logger.info(`Worker received job: ${JSON.stringify(job.data)}`);

    const { source, keyword } = job.data;
    if (!source) throw new Error("Missing 'source' in job data");

    const rawItems = await fetcherService.fetchFromSource(source, keyword);
    logger.info(
      `Fetched ${Array.isArray(rawItems) ? rawItems.length : 0} items from ${source}`,
    );

    const normalized = (Array.isArray(rawItems) ? rawItems : [])
      .map((it) => normalizeArticle(it, source))
      .filter(Boolean)
      .map((item) => ({
        ...item,
        description: item.description
          ? item.description.split(" ").slice(0, 120).join(" ")
          : null,
      }));

    logger.info(`After normalization ${normalized.length} items`);

    if (normalized.length === 0) return { count: 0 };

    let newContentIds = [];

    try {
      for (const item of normalized) {
        const result = await FetchedContent.updateOne(
          { url: item.url },
          {
            $set: {
              title: item.title,
              description: item.description,
              language: item.language,
              source: item.source,
              tags: item.tags,
              timestamp: item.timestamp,
            },
            $setOnInsert: {
              raw: item.raw,
              status: "fetched",
            },
          },
          { upsert: true },
        );

        if (result.upsertedId) {
          newContentIds.push(result.upsertedId._id);
        }
      }

      logger.info(`Saved ${normalized.length} normalized articles`);
      logger.info(`${newContentIds.length} new items added to DB.`);
    } catch (err) {
      logger.error("[DB Insert Error]", err?.message || err);
      if (!err?.writeErrors || err.writeErrors.length === 0) {
        throw err;
      }
    }

    return { saved: normalized.length, new: newContentIds.length };
  },
  {
    connection: redisConnection.connection,
    concurrency: 3,
  },
);

worker.on("completed", (job) => {
  logger.info(`Job completed: ${job.id}`);
});
worker.on("failed", (job, err) => {
  logger.error(`Job failed: ${job.id} | ${err.message}`);
});

export default worker;
