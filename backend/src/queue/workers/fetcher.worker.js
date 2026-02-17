import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import { connectDB } from "../../config/db.js";

import FetcherService from "../../modules/fetchers/fetcher.service.js";
import FetchedContent from "../../models/fetchedContent.model.js";

// import { enqueueSlotAllocation } from "../slotAllocator.queue.js";

import logger from "../../utils/logger.js";

await connectDB();

export default new Worker(
  "fetcher-queue",
  async (job) => {
    try {
      const { source, keyword } = job.data;
      logger.info(`Fetcher job started for source: ${source}, keyword: ${keyword}`);

      const rawItems = await FetcherService.fetchFromSource(source, keyword);
      logger.debug(`Fetched ${rawItems.length} items from ${source}`);

      for (const item of rawItems) {
        await FetchedContent.updateOne(
          { url: item.url },
          {
            $set: {
              ...item,
              source
            }
          },
          { upsert: true }
        );
      }

      logger.info(`Fetcher received ${rawItems.length} items from ${source}`);
      // if Event-based Slot-allocated use this otherWise Corn based is work
      // await enqueueSlotAllocation();
      // logger.info(`Slot allocation enqueued successfully`);
    } catch (error) {
      logger.error(`Fetcher job failed: ${error.message}`, error);
      throw error;
    }
  },
  { connection: redisConnection.connection }
);
