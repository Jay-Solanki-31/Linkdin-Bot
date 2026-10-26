import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import GeneratedPost from "../../models/generatedPost.model.js";
import { publishToLinkedIn } from "../../modules/publisher/linkedin.publisher.js";
import logger from "../../utils/logger.js";

export default new Worker(
  "linkedin-queue",
  async (job) => {
    const { postId, linkedinMemberUrn } = job.data;
    let attempted = false;
    try {
      if (!linkedinMemberUrn) return;
      logger.info(`Processing LinkedIn job: ${postId}`);

      const post = await GeneratedPost.findOneAndUpdate(
        {
          _id: postId,
          testMode: { $ne: true },
          scheduleVersion: (job.data.scheduleVersion || 0) === 0 ? { $in: [0, null] } : job.data.scheduleVersion,
          status: { $in: ["queued", "failed"] },
          failedStage: { $in: [null, "linkedin"] },
          linkedinPostUrn: null,
          linkedinMemberUrn,
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

      if (!post.linkedinMemberUrn || !linkedinMemberUrn || linkedinMemberUrn !== post.linkedinMemberUrn) {
        throw new Error("LinkedIn account does not match the post owner");
      }
      if (!post.text?.trim()) {
        throw new Error("Post text missing; refusing to publish");
      }


      logger.info(`Publishing post ${postId} to LinkedIn...`);

      const result = await publishToLinkedIn({
        beforeCreate: async () => {
          const marked = await GeneratedPost.updateOne({ _id: postId, linkedinMemberUrn, status: "publishing" }, { $set: { publishAttemptedAt: new Date() } });
          if (!marked.modifiedCount && !marked.matchedCount) throw new Error("Publishing claim is no longer valid");
          attempted = true;
        },
        text: post.text,
        imagePath: post.imagePath,
        url: post.url,
        linkedinMemberUrn: post.linkedinMemberUrn,
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
          imageStatus: result.imageUploaded ? "uploaded" : post.imageStatus,
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

      const retryable = !/token expired|not connected|account does not match|post text missing/i.test(err.message || "");
      const willRetry = !attempted && retryable && (job.attemptsMade + 1) < (job.opts?.attempts ?? 1);

      await GeneratedPost.updateOne({ _id: postId, status: "publishing" }, {
        $set: {
          status: attempted ? "review_required" : willRetry ? "queued" : "failed",
          failedStage: "linkedin",
          error: err.message?.slice(0, 512),
        },
        $inc: { attempts: 1 },
      });

      if (willRetry) throw err;
    }
  },
  {
    connection: redisConnection.connection,
    concurrency: 1,
    lockDuration:60000,
    stalledInterval:300000
  },
);
