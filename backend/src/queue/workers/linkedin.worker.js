import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import GeneratedPost from "../../models/generatedPost.model.js";
import { publishToLinkedIn } from "../../modules/publisher/linkedin.publisher.js";
import logger from "../../utils/logger.js";
import { connectDB } from "../../config/db.js";

await connectDB();

export default new Worker(
  "linkedin-queue",
  async (job) => {
    const { postId } = job.data;
    logger.info(`Processing LinkedIn job: ${postId}`);

    const post = await GeneratedPost.findOneAndUpdate(
      {
        _id: postId,
        status: { $nin: ["posted", "publishing"] },
        publishAt: { $lte: new Date() },
      },
      { $set: { status: "publishing" } },
      { new: true }
    );

    if (!post) {
      logger.info(`Post ${postId} not eligible for publishing (either scheduled for future or already processed).`);
      return;
    }

    try {
      logger.info(`Publishing post ${postId} to LinkedIn...`);

      const result = await publishToLinkedIn({ text: post.text });

      await GeneratedPost.findByIdAndUpdate(postId, {
        $set: {
          status: "posted",
          linkedinPostUrn: result?.data?.id || null,
          error: null,
        },
      });

      logger.info(`Post successfully published: ${postId}`);

    } catch (err) {
      logger.error(`Publishing failed for ${postId}: ${err.message}`);

      await GeneratedPost.findByIdAndUpdate(postId, {
        $set: {
          status: "failed",
          error: err.message?.slice(0, 512),
        },
        $inc: { attempts: 1 },
      });

      throw err;
    }
  },
  {
    connection: redisConnection.connection,
    concurrency: 1, 
  }
);
