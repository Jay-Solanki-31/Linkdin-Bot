import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import { JOB_TYPES } from "../jobTypes.js";
import GeneratedPost from "../../models/generatedPost.model.js";
import { publishToLinkedIn } from "../../modules/publisher/linkedin.publisher.js";
import logger from "../../utils/logger.js";
import { connectDB } from "../../config/db.js";

await connectDB();
new Worker(
  "linkedin-queue",
  async (job) => {
    if (job.name !== JOB_TYPES.POST_TO_LINKEDIN) return;

    const { postId } = job.data;
    const post = await GeneratedPost.findById(postId);

    if (!post) throw new Error("Post not found");

    if (post.status !== "queued") {
      logger.warn("Invalid post state", post.status);
      return;
    }

    try {
      const result = await publishToLinkedIn({ text: post.text });

      const linkedinUrn =
        result.data?.id ||
        result.data?.value ||
        result.data?.urn;

      if (!linkedinUrn) {
        throw new Error("LinkedIn URN missing");
      }

      post.status = "posted";
      post.postedAt = new Date();
      post.linkedinPostUrn = linkedinUrn;
      post.processing = false;
      post.processingAt = null;
      post.error = null;

      await post.save();

      logger.info("LinkedIn post published", postId);

    } catch (err) {
      post.status = "failed";
      post.processing = false;
      post.processingAt = null;
      post.error = JSON.stringify(
        err?.response?.data || { message: err.message }
      );

      await post.save();
      logger.error("LinkedIn post failed", postId);
      throw err;
    }
  },
  {
    connection: redisConnection.connection,
    concurrency: 1,
  }
);

process.on("unhandledRejection", (err) => {
  console.error("[UNHANDLED REJECTION]", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT EXCEPTION]", err);
  process.exit(1);
});

