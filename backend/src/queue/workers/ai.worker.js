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
    const { postId, linkedinMemberUrn } = job.data;
    if (!linkedinMemberUrn) {
      throw new Error("AI job is missing account ownership");
    }
    const currentAttempt = (job.attemptsMade ?? 0) + 1;
    const totalAttempts = job.opts?.attempts ?? 1;

    try {
      logger.info(`[AI] Processing ${postId} (Attempt ${currentAttempt}/${totalAttempts})`);

      const post = await GeneratedPost.findOneAndUpdate(
        {
          _id: postId,
          linkedinMemberUrn,
          status: { $in: ["draft", "failed"] },
          linkedinPostUrn: null,
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

      const content = post.creationMode === "manual" && !post.articleId ? { title: post.topic, description: post.topic, source: "topic" } : await FetchedContent.findOne({
        _id: post.articleId,
        linkedinMemberUrn,
      });

      if (!content) {
        throw new Error("Content not found");
      }

      // Reuse a previously generated text draft when only image generation failed.
      // This avoids paying for another Groq request on retry.
      const result = post.text?.trim()
        ? {
            text: post.text,
            imagePrompt: post.imagePrompt || "",
            promptType: post.promptType,
            sourceType: post.sourceType,
          }
        : await aiService.generateForContent(content, post.creationMode === "manual" ? post.customPrompt : "");

      if (post.creationMode !== "manual" && (!post.publishAt || Number.isNaN(new Date(post.publishAt).getTime()))) {
        throw new Error("Missing or invalid publishAt");
      }

      logger.info("[AI] Text available");
      // Persist successful text before any external image API request.
      post.text = result.text;
      post.imagePrompt = result.imagePrompt || "";
      post.promptType = result.promptType;
      post.sourceType = result.sourceType;
      post.title = content.title;
      post.url = content.url;
      await post.save();

      let image = null;
      if (result.imagePrompt?.trim()) {
        try {
          logger.info("[AI] Generating image");
          image = await imageGenerator.generate(result.imagePrompt, postId);
          logger.info("[AI] Image generated");
        } catch (imageError) {
          logger.warn(`[AI] Image unavailable for ${postId}; using text-only post: ${imageError.message}`);
        }
      }


      post.status = post.creationMode === "manual" ? "draft" : "queued";
      post.error = null;
      post.failedStage = null;
      post.lastFailedAt = null;
      post.text = result.text;

      post.imagePrompt = result.imagePrompt || "";
      post.imagePath = image?.imagePath || "";

      post.imageUrl = "";
      post.imageStatus = image ? "generated" : "failed";
      post.promptType = result.promptType;
      post.sourceType = result.sourceType;
      post.title = content.title;
      post.url = content.url;

      await post.save();

      const delay = Math.max(new Date(post.publishAt).getTime() - Date.now(), 0);

      if (post.creationMode === "manual" || post.testMode || job.data.testMode) {
        logger.info(`[AI] Leaving manual/test post ${postId} without LinkedIn publishing`);
      } else {
        await linkedinQueue.add(
          JOB_TYPES.POST_TO_LINKEDIN,
          { postId, linkedinMemberUrn: post.linkedinMemberUrn, scheduleVersion: post.scheduleVersion || 0 },
          { jobId: `linkedin-${postId}`, delay }
        );
      }

      logger.info("[AI] Completed");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      logger.error(
        `[AI] ${postId} failed (Attempt ${currentAttempt}/${totalAttempts}): ${message}`
      );

      if (currentAttempt < totalAttempts) {
        await GeneratedPost.updateOne({ _id: postId, status: "generating" }, {
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
        linkedinMemberUrn: job.data.linkedinMemberUrn,
        reason: err.message,
        attemptsMade: job.attemptsMade,
        failedAt: new Date(),
      },
      {
        jobId: `dlq-${postId}`,
      }
    );

    await GeneratedPost.updateOne({ _id: postId, status: "generating" }, {
      $set: {
        status: "failed",
        error: err.message,
        failedStage: "ai",
        lastFailedAt: new Date(),
      },
    });
  } catch (e) {
    logger.error(`[AI] ${postId} DLQ push failed: ${e.message}`);
  }
});

export default worker;