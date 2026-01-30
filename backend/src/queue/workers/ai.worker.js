import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import aiService from "../../modules/ai/ai.service.js";
import FetchedContent from "../../models/fetchedContent.model.js";
import logger from "../../utils/logger.js";
import { connectDB } from "../../config/db.js";

await connectDB();

const worker = new Worker(
  "ai-processing-queue",
  async (job) => {
    const { contentId } = job.data;
    logger.info("AI Worker processing", contentId);

const doc = await FetchedContent.findOneAndUpdate(
  {
    _id: contentId,
    processing: { $ne: true },
  },
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
  logger.warn("AI Worker skipped (locked)", contentId);
  return;
}

    try {
      const text = await aiService.generateForContent(contentId);
      if (!text) throw new Error("AI returned empty response");

      await FetchedContent.findByIdAndUpdate(contentId, {
        $set: {
          processing: false,
          processingAt: null,
          isQueued: false,
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

export default worker;
