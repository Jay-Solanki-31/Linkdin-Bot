import cron from "node-cron";
import GeneratedPost from "../../models/generatedPost.model.js";
import { enqueueLinkedInPost } from "../../queue/linkedin.queue.js";
import logger from "../../utils/logger.js";

export const startLinkedInPostScheduler = () => {
  logger.info("LinkedIn Post Scheduler running every 30 minutes");

  cron.schedule("*/30 * * * *", async () => {
    try {
      const post = await GeneratedPost.findOneAndUpdate(
        {
          status: "queued",
          processing: { $ne: true },
        },
        {
          $set: {
            processing: true,
            processingAt: new Date(),
          },
        },
        { sort: { createdAt: 1 }, new: true }
      );

      if (!post) {
        logger.info("[LinkedIn Scheduler] No post to publish");
        return;
      }

      await enqueueLinkedInPost(post._id.toString());
      logger.info("[LinkedIn Scheduler] Post queued", post._id);

    } catch (err) {
      logger.error("[LinkedIn Scheduler] Error", err);
    }
  });
};
