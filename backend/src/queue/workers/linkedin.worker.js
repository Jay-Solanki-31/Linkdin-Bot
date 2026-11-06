import {
  failureCode,
  activityEntry,
  activityPush,
} from "../../utils/publishingDiagnostics.js";
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
    let claimed = false;
    try {
      if (!linkedinMemberUrn) return;
      logger.info(`Processing LinkedIn job: ${postId}`);

      const post = await GeneratedPost.findOneAndUpdate(
        {
          _id: postId,
          testMode: { $ne: true },
          scheduleVersion:
            (job.data.scheduleVersion || 0) === 0
              ? { $in: [0, null] }
              : job.data.scheduleVersion,
          status: "queued",
          failedStage: { $in: [null, "linkedin"] },
          linkedinPostUrn: null,
          publishAttemptedAt: null,
          linkedinMemberUrn,
          publishAt: { $lte: new Date() },
        },
        {
          $set: { status: "publishing" },
          $push: activityPush(
            activityEntry("publishing_started", "linkedin", "worker"),
          ),
        },
        { returnDocument: "after" },
      );

      if (!post) {
        logger.info(
          `Post ${postId} not eligible for publishing (either scheduled for future or already processed).`,
        );
        return;
      }

      claimed = true;
      if (
        !post.linkedinMemberUrn ||
        !linkedinMemberUrn ||
        linkedinMemberUrn !== post.linkedinMemberUrn
      ) {
        throw new Error("LinkedIn account does not match the post owner");
      }
      if (!post.text?.trim()) {
        throw new Error("Post text missing; refusing to publish");
      }


      logger.info(`Publishing post ${postId} to LinkedIn...`);

      const result = await publishToLinkedIn({
        beforeCreate: async () => {
          // An indeterminate marker write is conservatively quarantined.
          attempted = true;
          const marked = await GeneratedPost.updateOne(
            {
              _id: postId,
              linkedinMemberUrn,
              status: "publishing",
              publishAttemptedAt: null,
            },
            { $set: { publishAttemptedAt: new Date() } },
            { writeConcern: { w: "majority", j: true } },
          );
          if (!marked.modifiedCount && !marked.matchedCount)
            throw new Error("Publishing claim is no longer valid");
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

      const persisted = await GeneratedPost.findOneAndUpdate(
        { _id: postId, linkedinMemberUrn, status: "publishing" },
        {
          $set: {
            status: "posted",
            linkedinPostUrn: urn,
            linkedinPostUrl: `https://www.linkedin.com/feed/update/${urn}/`,
            imageStatus: result.imageUploaded ? "uploaded" : post.imageStatus,
            error: null,
            postedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          $push: activityPush(
            activityEntry("publishing_succeeded", "linkedin", "worker"),
          ),
          $unset: { imagePath: "", imagePrompt: "" },
        },
      );

      if (!persisted)
        throw new Error("Publishing result could not be persisted");
      logger.info(`Post successfully published: ${postId} → ${urn}`);
    } catch (err) {
      if (!claimed) throw new Error("LINKEDIN_CLAIM_UNAVAILABLE");
      logger.error(
        `Publishing failed for ${postId}: ${failureCode(err, "linkedin")}`,
      );

      const retryable =
        !/token expired|not connected|account does not match|post text missing/i.test(
          err.message || "",
        );
      const willRetry =
        !attempted &&
        retryable &&
        job.attemptsMade + 1 < (job.opts?.attempts ?? 1);

      await GeneratedPost.updateOne(
        { _id: postId, linkedinMemberUrn, status: "publishing" },
        {
          $set: {
            status: attempted
              ? "review_required"
              : willRetry
                ? "queued"
                : "failed",
            failedStage: "linkedin",
            error: attempted
              ? "Publishing outcome could not be confirmed. Check LinkedIn before taking further action."
              : "Publishing failed before public creation.",
            errorCode: failureCode(err, "linkedin"),
            lastFailedAt: new Date(),
          },
          $inc: { attempts: 1 },
          $push: activityPush(
            activityEntry(
              attempted ? "publishing_outcome_uncertain" : "publishing_failed",
              "linkedin",
              "worker",
            ),
          ),
        },
      );

      if (willRetry) throw new Error(failureCode(err, "linkedin"));
    }
  },
  {
    connection: redisConnection.connection,
    concurrency: 1,
    lockDuration: 60000,
    stalledInterval: 300000,
  },
);
