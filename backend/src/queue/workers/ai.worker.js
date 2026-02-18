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

    const post = await GeneratedPost.findOneAndUpdate(
      {
        _id: postId,
        status: { $in: ["draft"] },
      },
      { $set: { status: "generating" } },
      { returnDocument: 'after' }
    );

    if (!post) {
      logger.warn(`Post not eligible for AI generation: ${postId}`);
      return;
    }

    const content = await FetchedContent.findById(post.articleId);
    if (!content) {
      logger.error(`Content not found for articleId: ${post.articleId}`);
      throw new Error("Content not found");
    }

    const text = await aiService.generateForContent(content);
    logger.info(`Generated text for postId: ${postId}`);

    post.status = "queued";
    post.text = text;
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

    logger.info(
      `AI job completed for ${postId} with delay: ${delay}ms`
    );
  },
  { connection: redisConnection.connection }
);

