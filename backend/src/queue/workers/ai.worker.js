import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import aiService from "../../modules/ai/ai.service.js";
import FetchedContent from "../../models/fetchedContent.model.js";
import logger from "../../utils/logger.js";

const worker = new Worker(
  "ai-processing-queue",
  async (job) => {
    const { contentId } = job.data;
    logger.info("AI Worker: processing job", job.id, "contentId", contentId);

    const doc = await FetchedContent.findOneAndUpdate(
      { _id: contentId, processing: { $ne: true } },
      {
        $set: {
          processing: true,
          processingAt: new Date(),
          isQueued: true,
          aiError: null,
        },
      },
      { new: true }
    );

    if (!doc) {
      logger.warn("AI Worker: content locked or missing:", contentId);
      return;
    }

    try {
      const res = await aiService.generateForContent(contentId);

      if (!res) {
        throw new Error("AI returned empty response");
      }

      logger.info("AI Worker: generated content for", contentId);
      return { ok: true };

    } catch (err) {
      logger.error("AI Worker: job failed", job.id, err?.message || err);

      await FetchedContent.findByIdAndUpdate(contentId, {
        $set: {
          processing: false,
          processingAt: null,
          isQueued: false,
          aiError: err.message?.slice(0, 512) || "unknown",
        },
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
