import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import GeneratedPost from "../../models/generatedPost.model.js";
import { publishToLinkedIn } from "../../modules/publisher/linkedin.publisher.js";
import logger from "../../utils/logger.js";

export default new Worker(
  "linkedin-queue",
  async (job) => {
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
        imagePath: post.imagePath,
        url: post.url,
      });

      const urn = result?.urn;

      if (!urn) {
        throw new Error("LinkedIn did not return a post URN");
      }

      await GeneratedPost.findByIdAndUpdate(postId, {
        $set: {
          status: "posted",
          linkedinPostUrn: urn,
          linkedinPostUrl:`https://www.linkedin.com/feed/update/${urn}/`,
          imageStatus: "uploaded",
          error: null,
          postedAt: new Date(),
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          )
        },
         $unset:{imagePath:"", imagePrompt:""}
      });

      logger.info(`Post successfully published: ${postId} → ${urn}`);
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
    lockDuration:60000,
    stalledInterval:300000
  },
);
