import cron from "node-cron";
import FetchedContent from "../../models/fetchedContent.model.js";
import { addAIJob } from "../../queue/ai.queue.js";
import logger from "../../utils/logger.js";

export const startAIScheduler = (cronExpression = "*/45 * * * *") => {
  logger.info("AI Scheduler starting with cron jobs at every 45 Minutes :", cronExpression);

  cron.schedule(cronExpression, async () => {
    try {
      logger.info("AI Scheduler: looking for next content");

      const doc = await FetchedContent.findOneAndUpdate(
        {
          $and: [
            { aiGenerated: false },
            { isQueued: { $ne: true } },
            { processing: { $ne: true } }
          ]
        },
        {
          $set: { isQueued: true }
        },
        { sort: { createdAt: 1 }, returnDocument: "after" }
      );

      if (!doc) {
        logger.info("AI Scheduler: no pending items");
        return;
      }

      await addAIJob(doc._id.toString());
      logger.info("AI Scheduler: queued content for AI:", doc._id.toString());
    } catch (err) {
      logger.error("AI Scheduler error:", err?.message || err);
    }
  });

  logger.info("AI Scheduler started");
};
