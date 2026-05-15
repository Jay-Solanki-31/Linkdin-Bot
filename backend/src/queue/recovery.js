import GeneratedPost from "../models/generatedPost.model.js";

import { aiQueue } from "./ai.queue.js";
import { JOB_TYPES } from "./jobTypes.js";

import logger from "../utils/logger.js";

const STUCK_TIME = 30 * 60 * 1000;
const MAX_RECOVERY_ATTEMPTS = 3;

export const recoverStuckJobs = async () => {

  try {

    logger.info("Recovery cron started");

    const cutoff = new Date(Date.now() - STUCK_TIME);

    const stuckPosts = await GeneratedPost.find({
      status: {
        $in: ["generating", "failed"],
      },

      updatedAt: {
        $lt: cutoff,
      },

      recoveryAttempts: {
        $lt: MAX_RECOVERY_ATTEMPTS,
      },
    });

    logger.info(`Found ${stuckPosts.length} stuck posts`);

    for (const post of stuckPosts) {

      try {

        await GeneratedPost.findByIdAndUpdate(post._id, {

          status: "draft",

          error: null,

          $inc: {
            recoveryAttempts: 1,
          },

        });

        await aiQueue.add(
          JOB_TYPES.GENERATE_POST,
          {
            postId: post._id,
          },
          {
            jobId: `recovery-ai-${post._id}-${Date.now()}`,
          }
        );

        logger.info(`Recovered stuck AI post ${post._id}`);

      } catch (err) {

        logger.error(
          `Recovery failed for ${post._id}: ${err.message}`
        );

      }
    }

  } catch (err) {

    logger.error(`Recovery cron failed: ${err.message}`);

  }
};