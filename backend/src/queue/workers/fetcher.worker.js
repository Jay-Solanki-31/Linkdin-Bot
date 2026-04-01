import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";

import FetcherService from "../../modules/fetchers/fetcher.service.js";
import FetchedContent from "../../models/fetchedContent.model.js";

// import { enqueueSlotAllocation } from "../slotAllocator.queue.js";

import logger from "../../utils/logger.js";


function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.search = "";
    return u.toString();
  } catch {
    return url;
  }
}

export default new Worker(
  "fetcher-queue",
  async (job) => {
    try {
      const { source, keyword } = job.data;
      logger.info(
        `Fetcher job started for source: ${source}, keyword: ${keyword}`
      );

      const rawItems = await FetcherService.fetchFromSource(source, keyword);

      logger.info(`Fetched ${rawItems.length} items from ${source}`);

      if (!rawItems.length) {
        logger.warn(`No items fetched from ${source}`);
        return;
      }

     
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const operations = rawItems.map((item) => {
        const normalizedUrl = normalizeUrl(item.url);

        return {
          updateOne: {
            filter: { url: normalizedUrl },
            update: {
              $set: {
                ...item,
                url: normalizedUrl,
                source,
                expiresAt,
              },
              $setOnInsert: {
                createdAt: now,
              },
            },
            upsert: true,
          },
        };
      });

      const result = await FetchedContent.bulkWrite(operations, {
        ordered: false, 
      });

      const inserted = result.upsertedCount || 0;
      const modified = result.modifiedCount || 0;
      const matched = result.matchedCount || 0;
      const duplicates = rawItems.length - inserted;

      logger.info(
        `Fetcher ${source}: fetched=${rawItems.length}, inserted=${inserted}, updated=${modified}, matched=${matched}, duplicates=${duplicates}`
      );

      if (inserted === 0) {
        logger.warn(`No new content from ${source}`);
      }

    } catch (error) {
      logger.error(`Fetcher job failed: ${error.message}`, error);
      throw error;
    }
  },
  {
    connection: redisConnection.connection,
    concurrency: 5, 
  }
);
