import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import aiService from "../../modules/ai/ai.service.js";
import imageGenerator from "../../services/imageGenerator.js";

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
    const currentAttempt = (job.attemptsMade ?? 0) + 1;
    const totalAttempts = job.opts?.attempts ?? 1;

    try {
      logger.info(`[AI] Processing ${postId} (Attempt ${currentAttempt}/${totalAttempts})`);

      const post = await GeneratedPost.findOneAndUpdate(
        {
          _id: postId,
          status: { $in: ["draft"] },
        },
        {
          $set: {
            status: "generating",
            error: null,
            failedStage: null,
          },
        },
        {
          returnDocument: "after",
        }
      );

      if (!post) {
        logger.warn(`[AI] Post not eligible for AI generation: ${postId}`);
        return;
      }

      const content = await FetchedContent.findById(post.articleId);

      if (!content) {
        throw new Error("Content not found");
      }

      const result = await aiService.generateForContent(content);

      logger.info("[AI] Text generated");
      logger.info("[AI] Generating image");

      const image = await imageGenerator.generate(result.imagePrompt, postId);

      logger.info("[AI] Image generated");

      post.status = "queued";
      post.error = null;
      post.failedStage = null;
      post.lastFailedAt = null;
      post.text = result.text;

      post.imagePrompt = result.imagePrompt;
      post.imagePath = image.imagePath;

      post.imageUrl = "";
      post.imageStatus = "generated";
      post.promptType = result.promptType;
      post.sourceType = result.sourceType;
      post.title = content.title;
      post.url = content.url;

      await post.save();

      const delay = Math.max(new Date(post.publishAt).getTime() - Date.now(), 0);

      await linkedinQueue.add(
        JOB_TYPES.POST_TO_LINKEDIN,
        { postId },
        {
          jobId: `linkedin-${postId}`,
          delay,
        }
      );

      logger.info("[AI] Completed");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      logger.error(
        `[AI] ${postId} failed (Attempt ${currentAttempt}/${totalAttempts}): ${message}`
      );

      if (currentAttempt < totalAttempts) {
        await GeneratedPost.findByIdAndUpdate(postId, {
          $set: {
            status: "draft",
            error: message,
            failedStage: "ai",
            lastFailedAt: new Date(),
          },
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
    logger.error(`[AI] ${postId} DLQ push failed: ${e.message}`);
  }
});

export default worker;