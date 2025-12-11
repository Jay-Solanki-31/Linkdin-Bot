// src/queue/workers/ai.worker.js
import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import aiService from "../../modules/ai/ai.service.js";
import FetchedContent from "../../models/fetchedContent.model.js";
import logger from "../../utils/logger.js";

const worker = new Worker(
  "ai-processing-queue",
  async (job) => {
    const contentId = job.data.contentId;
    logger.info("AI Worker: processing job", job.id, "contentId", contentId);

    const doc = await FetchedContent.findOneAndUpdate(
      { _id: contentId, processing: { $ne: true } },
      { $set: { processing: true, processingAt: new Date(), isQueued: true } },
      { new: true }
    );

    if (!doc) {
      logger.warn("AI Worker: content locked or missing:", contentId);
      return { ok: false, reason: "locked_or_missing" };
    }

    try {
      const res = await aiService.generateForContent(contentId);
      if (!res) {
        await FetchedContent.findByIdAndUpdate(contentId, { $set: { processing: false, processingAt: null, isQueued: false } });
        logger.warn("AI Worker: no result for", contentId);
        return { ok: false };
      }

      logger.info("AI Worker: generated content for", contentId);
      return { ok: true };
    } catch (err) {
      logger.error("AI Worker: job failed", job.id, err?.message || err);

      await FetchedContent.findByIdAndUpdate(contentId, {
        $set: { processing: false, processingAt: null, isQueued: false, aiError: err.message?.slice(0, 512) || "unknown" }
      });

      throw err;
    }
  },
  {
    connection: redisConnection.connection,
    concurrency: 1, 
  }
);

worker.on("completed", (job) => {
  logger.info("AI Worker: job completed", job.id);
});
worker.on("failed", (job, err) => {
  logger.error("AI Worker: job failed", job.id, err?.message || err);
});

export default worker;
