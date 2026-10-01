import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";

import FetcherService from "../../modules/fetchers/fetcher.service.js";
import { filterHackerNewsDuplicates } from "../../modules/fetchers/filterHackerNewsDuplicates.js";
import FetchedContent from "../../models/fetchedContent.model.js";
import { normalizeFetchedUrl } from "../../utils/normalizeFetchedUrl.js";

// import { enqueueSlotAllocation } from "../slotAllocator.queue.js";

import logger from "../../utils/logger.js";


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

      let itemsToStore = rawItems.map((item) => ({
        ...item,
        url: normalizeFetchedUrl(item.url, source),
      }));
      let duplicatesSkipped = 0;

      if (source === "hackernews") {
        const validItems = itemsToStore.filter(
          (item) => item.sourceItemId && item.url
        );
        duplicatesSkipped += itemsToStore.length - validItems.length;

        const existing = await FetchedContent.find({
          $or: [
            { url: { $in: validItems.map((item) => item.url) } },
            {
              sourceItemId: {
                $in: validItems.map((item) => item.sourceItemId),
              },
            },
          ],
        })
          .select("url sourceItemId")
          .lean();
        const deduplicated = filterHackerNewsDuplicates(validItems, existing);
        itemsToStore = deduplicated.items;
        duplicatesSkipped += deduplicated.duplicatesSkipped;
      }

      if (!itemsToStore.length) {
        logger.info(
          `Fetcher ${source}: fetched=${rawItems.length}, valid=0, duplicatesSkipped=${duplicatesSkipped}`
        );
        return;
      }

      const operations = itemsToStore.map((item) => {
        const normalizedUrl = item.url;

        return {
          updateOne: {
            filter: item.sourceItemId
              ? { sourceItemId: item.sourceItemId }
              : { url: normalizedUrl },
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
      const duplicates = duplicatesSkipped + matched;

      logger.info(
        `Fetcher ${source}: fetched=${rawItems.length}, valid=${itemsToStore.length}, inserted=${inserted}, updated=${modified}, matched=${matched}, duplicatesSkipped=${duplicates}`
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
    lockDuration:60000,
    stalledInterval:300000
  }
);
