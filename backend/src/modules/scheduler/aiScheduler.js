import cron from "node-cron";
import dayjs from "dayjs";
import logger from "../../utils/logger.js";
import { addAIJob } from "../../queue/ai.queue.js";

export const startAIScheduler = () => {
  logger.info("AI Scheduler running every 45 minutes (Tue–Thu)");

  cron.schedule("*/45 * * * *", async () => {
    const now = dayjs();
    const day = now.day(); // 0=Sun, 1=Mon, ..., 6=Sat

    // Allow only Tue(2), Wed(3), Thu(4)
    if (![2, 3, 4].includes(day)) {
      return;
    }

    try {
      logger.info("[AI Scheduler] Queueing AI generation job");
      await addAIJob.add("GENERATE_AI_POST", {});
    } catch (err) {
      logger.error("[AI Scheduler] Error", err);
    }
  });
};
