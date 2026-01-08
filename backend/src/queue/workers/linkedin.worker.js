import { Worker } from "bullmq";
import connection from "../connection.js";
import { JOB_TYPES } from "../jobTypes.js";
import GeneratedPost from "../../models/generatedPost.model.js";
import { publishToLinkedIn } from "../../modules/publisher/linkedin.publisher.js";
import logger from "../../utils/logger.js";

new Worker(
  "linkedin-queue",
  async (job) => {
    if (job.name !== JOB_TYPES.POST_TO_LINKEDIN) return;

    const { postId } = job.data;

    const post = await GeneratedPost.findById(postId);
    if (!post) throw new Error("GeneratedPost not found");

    if (post.status === "posted") {
      logger.warn("Post already published", postId);
      return;
    }

    post.status = "queued";
    await post.save();

    try {
      const result = await publishToLinkedIn({
        text: post.text,
      });

      post.status = "posted";
      post.postedAt = new Date();
      post.linkedinPostUrn = result.data.id;
      post.error = null;

      await post.save();

      logger.info("LinkedIn post published", {
        postId,
        linkedinUrn: result.data.id,
      });

    } catch (err) {
      post.status = "failed";
      post.error = err.message;
      await post.save();

      logger.error("LinkedIn post failed", {
        postId,
        error: err.message,
      });

      throw err;
    }
  },
  { connection }
);
