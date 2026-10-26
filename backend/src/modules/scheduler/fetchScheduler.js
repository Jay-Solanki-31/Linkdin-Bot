import { automationEnabled } from "../../services/automation.service.js";
import cron from "node-cron";
import { fetcherQueue } from "../../queue/fetcher.queue.js";
import logger from "../../utils/logger.js";
import LinkedInToken from "../../models/linkedinToken.model.js";

export const startFetchScheduler = () => {
  logger.info("Fetch Scheduler running every Sunday at 11 AM (Asia/Kolkata)");

  cron.schedule(
    "0 11 * * 0",
    async () => {
      try {
        logger.info("Fetch Scheduler triggered — queuing fetch jobs");

        const sources = [
          "devto",
          "github",
          "medium",
          "hackernews",
          "nodeweekly",
          "reddit"
        ];

        const accounts = await LinkedInToken.find({ memberUrn: { $type: "string" } }).select("memberUrn").lean();
        for (const account of accounts) {
        if (!(await automationEnabled(account.memberUrn))) continue;
          for (const source of sources) {
            await fetcherQueue.add("FETCH_CONTENT", {
              source,
              linkedinMemberUrn: account.memberUrn,
            }, { jobId: `fetch-${account.memberUrn}-${source}-${Date.now()}` });
          }
        }

        logger.info("Fetch jobs queued for all sources");

      } catch (err) {
        logger.error("Fetch Scheduler error", err);
      }
    },
    {
      timezone: "Asia/Kolkata"
    }
  );
};
