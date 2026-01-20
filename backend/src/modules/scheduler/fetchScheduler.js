import cron from "node-cron";
import { fetcherQueue } from "../../queue/fetcher.queue.js";
import logger from "../../utils/logger.js";

export const startFetchScheduler = () => {
  logger.info("Fetch Scheduler running every 2 days at 11 AM");

  cron.schedule("0 11 */2 * *", async () => {
    try {
      logger.info("Fetch Scheduler triggered — queuing fetch jobs");

      const sources = ["devto", "github", "medium", "npm", "hashnode", "nodeweekly", "reddit", "dailydev"];

      for (const source of sources) {
        await fetcherQueue.add("FETCH_CONTENT", { source });
      }

      logger.info("Fetch jobs queued for all sources");

    } catch (err) {
      logger.error("Fetch Scheduler error", err);
    }
  });
};
