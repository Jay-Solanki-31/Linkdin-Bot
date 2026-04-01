import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import GeneratedPost from "../../models/generatedPost.model.js";
import { publishToLinkedIn } from "../../modules/publisher/linkedin.publisher.js";
import logger from "../../utils/logger.js";

import {jobDurationHistogram,jobProcessedCounter,jobFailedCounter} from '../../utils/metrics.js';

export default new Worker(
  "linkedin-queue",
  async (job) => {
    const end = jobDurationHistogram.startTimer();
   try {
    const { postId } = job.data;
    logger.info(`Processing LinkedIn job: ${postId}`);

    const post = await GeneratedPost.findOneAndUpdate(
      {
        _id: postId,
        status: { $nin: ["posted", "publishing"] },
        linkedinPostUrn: { $exists: false },
        publishAt: { $lte: new Date() },
      },
      { $set: { status: "publishing" } },
      { returnDocument: "after" },
    );

    if (!post) {
      logger.info(
        `Post ${postId} not eligible for publishing (either scheduled for future or already processed).`,
      );
      return;
    }

   
      logger.info(`Publishing post ${postId} to LinkedIn...`);

      const result = await publishToLinkedIn({
        text: post.text,
        url: post.url,
        title: post.title,
      });

      const urn = result?.urn;

      if (!urn) {
        throw new Error("LinkedIn did not return a post URN");
      }

      await GeneratedPost.findByIdAndUpdate(postId, {
        $set: {
          status: "posted",
          linkedinPostUrn: urn,
          error: null,
          postedAt: new Date(),
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          )
        },
      });

      logger.info(`Post successfully published: ${postId} → ${urn}`);
      jobProcessedCounter.inc({ type : "linkedin"});
    } catch (err) {
      jobFailedCounter.inc({ type : "linkedin"});
      logger.error(`Publishing failed for ${postId}: ${err.message}`);

      await GeneratedPost.findByIdAndUpdate(postId, {
        $set: {
          status: "failed",
          error: err.message?.slice(0, 512),
        },
        $inc: { attempts: 1 },
      });

      throw err;
    } finally{
      end({ type: "linkedin" });
    }
  },
  {
    connection: redisConnection.connection,
    concurrency: 1,
  },
);
