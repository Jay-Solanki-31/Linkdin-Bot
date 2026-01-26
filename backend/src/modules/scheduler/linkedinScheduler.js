import { Worker } from "bullmq";
import { redisConnection } from "../../queue/connection.js";
import aiService from "../../modules/ai/ai.service.js";
import FetchedContent from "../../models/fetchedContent.model.js";
import logger from "../../utils/logger.js";

export const startLinkedInScheduler = () => new Worker(
  "ai-processing-queue",
  async (job) => {
    const { contentId } = job.data;
    logger.info("AI Worker processing", contentId);

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
      logger.warn("AI Worker skipped (locked or missing)", contentId);
      return;
    }

    try {
      const res = await aiService.generateForContent(contentId);
      if (!res) throw new Error("AI returned empty response");

      await FetchedContent.findByIdAndUpdate(contentId, {
        $set: {
          processing: false,
          processingAt: null,
          aiGenerated: true,
          status: "generated",
        },
      });

      logger.info("AI Worker success", contentId);
      return { ok: true };

    } catch (err) {
      logger.error("AI Worker failed", err.message);

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