import cron from "node-cron";
import GeneratedPost from "../../models/generatedPost.model.js";
import { enqueueLinkedInPost } from "../../queue/linkedin.queue.js";
import logger from "../../utils/logger.js";

/**
 * Runs only on Tue–Thu at:
 * 08:30, 12:30, 17:30
 */
export const startLinkedInScheduler = () => {
  logger.info("LinkedIn Scheduler starting");

  // ───────── 08:30 AM ─────────
  cron.schedule("30 8 * * 2-4", () => runPosting("08:30"));

  // ───────── 12:30 PM ─────────
  cron.schedule("30 12 * * 2-4", () => runPosting("12:30"));

  // ───────── 05:30 PM ─────────
  cron.schedule("30 17 * * 2-4", () => runPosting("17:30"));

  logger.info("LinkedIn Scheduler started (Tue–Thu)");
};

async function runPosting(slot) {
  try {
    logger.info(`LinkedIn Scheduler: checking posts for ${slot}`);

    const post = await GeneratedPost.findOneAndUpdate(
      {
        status: "draft"
      },
      {
        $set: { status: "queued" }
      },
      {
        sort: { createdAt: 1 },
        returnDocument: "after"
      }
    );

    if (!post) {
      logger.info("LinkedIn Scheduler: no draft posts");
      return;
    }

    await enqueueLinkedInPost(post._id.toString());

    logger.info("LinkedIn Scheduler: queued post", {
      postId: post._id,
      slot
    });

  } catch (err) {
    logger.error("LinkedIn Scheduler error:", err?.message || err);
  }
}
