import cron from "node-cron";
import dayjs from "dayjs";
import logger from "../../utils/logger.js";
import { addAIJob } from "../../queue/ai.queue.js";
import FetchedContent from "../../models/fetchedContent.model.js";

export const startAIScheduler = () => {
  logger.info("AI Scheduler running every 45 minutes (Tue–Thu)");

  cron.schedule("*/45 * * * *", async () => {
    const day = dayjs().day();
    if (![2, 3, 4].includes(day)) return;

    try {
      const content = await FetchedContent.findOneAndUpdate(
        {
          status: "selected",
          slot: { $ne: null },
          aiGenerated: false,
          isQueued: { $ne: true },
        },
        {
          $set: { isQueued: true},
        },
        {
          sort: { slot: 1 }, 
          new: true,
        }
      ).select("_id");

      if (!content) {
        logger.info("[AI Scheduler] No content available");
        return;
      }

      await addAIJob(content._id.toString());
      logger.info("[AI Scheduler] AI job queued", content._id);

    } catch (err) {
      logger.error("[AI Scheduler] Error", err);
    }
  });
};
