import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import aiService from "../../modules/ai/ai.service.js";

import GeneratedPost from "../../models/generatedPost.model.js";
import FetchedContent from "../../models/fetchedContent.model.js";

import { linkedinQueue } from "../linkedin.queue.js";
import { JOB_TYPES } from "../jobTypes.js";

import logger from "../../utils/logger.js";
import { connectDB } from "../../config/db.js";

await connectDB();

export default new Worker(
  "ai-processing-queue",
  async (job) => {
    const { postId } = job.data;
    logger.info(`Processing AI job for postId: ${postId}`);

    const post = await GeneratedPost.findById(postId);
    if (!post || post.text) {
      logger.warn(`Post not found or already has text: ${postId}`);
      return;
    }

    await GeneratedPost.findByIdAndUpdate(postId, {
      $set: { status: "generating" },
    });

    const content = await FetchedContent.findById(post.articleId);
    if (!content) {
      logger.error(`Content not found for articleId: ${post.articleId}`);
      throw new Error("Content not found");
    }

    const text = await aiService.generateForContent(content);
    logger.info(`Generated text for postId: ${postId}`);
      await GeneratedPost.findByIdAndUpdate(postId, {
        $set: {
          status: "queued",
          text,
          title: content.title, 
        },
      });

      const updatedPost = await GeneratedPost.findById(postId);
      const delay = Math.max(new Date(updatedPost.publishAt).getTime() - Date.now(), 0);

    await linkedinQueue.add(
      JOB_TYPES.POST_TO_LINKEDIN,
      { postId },
      {
        jobId: `linkedin-${postId}`,
        delay,
      },
    );
    logger.info(`AI job completed for ${postId} with delay: ${delay}ms`);
  },
  { connection: redisConnection.connection },
);

