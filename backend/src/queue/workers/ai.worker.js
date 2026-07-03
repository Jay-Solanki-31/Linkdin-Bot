import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import aiService from "../../modules/ai/ai.service.js";

import GeneratedPost from "../../models/generatedPost.model.js";
import FetchedContent from "../../models/fetchedContent.model.js";

import { linkedinQueue } from "../linkedin.queue.js";
import { JOB_TYPES } from "../jobTypes.js";

import logger from "../../utils/logger.js";

import { aiDLQ } from "../ai.dlq.queue.js";

const worker = new Worker(
  "ai-processing-queue",
  async (job) => {
    const { postId } = job.data;

    try {

      logger.info(`Processing AI job for postId: ${postId}`);

      const post = await GeneratedPost.findOneAndUpdate(
        {
          _id: postId,
          status: { $in: ["draft"] },
        },
        {
          $set: {
            status: "generating",
          },
        },
        {
          returnDocument: "after",
        }
      );

      if (!post) {
        logger.warn(`Post not eligible for AI generation: ${postId}`);
        return;
      }

      const content = await FetchedContent.findById(post.articleId);

      if (!content) {
        throw new Error("Content not found");
      }

      // throw new Error("TEST_RETRY");

      const result =
        await aiService.generateForContent(content);

      logger.info(
        `Generated text for postId: ${postId}`
      );

      post.status = "queued";
      post.text = result.text;
      post.promptType = result.promptType;
      post.sourceType = result.sourceType;
      post.title = content.title;
      post.url = content.url;

      await post.save();

      const delay = Math.max(
        new Date(post.publishAt).getTime() - Date.now(),
        0
      );

      await linkedinQueue.add(
        JOB_TYPES.POST_TO_LINKEDIN,
        { postId },
        {
          jobId: `linkedin-${postId}`,
          delay,
        }
      );

      logger.info(`AI job completed for ${postId}`);

    } catch (err) {

      logger.error(`AI job failed: ${err.message}`);

      if (job.attemptsMade + 1 < job.opts.attempts) {

        await GeneratedPost.findByIdAndUpdate(postId, {
          status: "draft",
          error: err.message,
        });

      }

      throw err;
    }
  },
  {
    connection: redisConnection.connection,
  }
);

worker.on("failed", async (job, err) => {
  if (job.attemptsMade < job.opts.attempts) {
    return;
  }

  const { postId } = job.data;

  logger.error(`DLQ triggered for ${postId}`);

  try {
    await aiDLQ.add(
      "AI_JOB_FAILED",
      {
        postId,
        reason: err.message,
        attemptsMade: job.attemptsMade,
        failedAt: new Date(),
      },
      {
        jobId: `dlq-${postId}`,
      }
    );

    await GeneratedPost.findByIdAndUpdate(postId, {
      status: "failed",
      error: err.message,
      failedStage: "ai",
      lastFailedAt: new Date(),
    });
  } catch (e) {
    logger.error(`DLQ push failed: ${e.message}`);
  }
});

export default worker;