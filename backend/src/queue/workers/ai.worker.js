import { randomUUID } from "node:crypto";
import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import aiService from "../../modules/ai/ai.service.js";
import imageGenerator from "../../services/imageGenerator.js";

import GeneratedPost from "../../models/generatedPost.model.js";
import FetchedContent from "../../models/fetchedContent.model.js";
import { enqueueCurrentPost } from "../../services/postScheduling.service.js";
import {
  failureCode,
  activityEntry,
  activityPush,
} from "../../utils/publishingDiagnostics.js";
import logger from "../../utils/logger.js";
import { aiDLQ } from "../ai.dlq.queue.js";
import { loadWritingPreferences } from "../../services/writingPreferences.service.js";
import { validatePreferences } from "../../utils/writingPreferences.js";

const worker = new Worker(
  "ai-processing-queue",
  async (job) => {
    const { postId, linkedinMemberUrn, recoveryId } = job.data;
    if (!linkedinMemberUrn)
      throw new Error("AI job is missing account ownership");
    const runId = randomUUID();
    const scope = {
      _id: postId,
      linkedinMemberUrn,
      status: "generating",
      generationRunId: runId,
    };
    const currentAttempt = (job.attemptsMade || 0) + 1;
    const totalAttempts = job.opts?.attempts || 1;
    let claimed = false;
    try {
      const post = await GeneratedPost.findOneAndUpdate(
        {
          _id: postId,
          linkedinMemberUrn,
          linkedinPostUrn: null,
          publishAttemptedAt: null,
          $or: [
            { status: "draft" },
            { status: "failed", failedStage: { $in: ["ai", "ai_generation"] } },
            { status: "generating", generationJobId: String(job.id) },
          ],
          ...(recoveryId
            ? {
                "recoveryIntent.id": recoveryId,
                "recoveryIntent.state": { $in: ["pending", "running"] },
              }
            : {
                "recoveryIntent.state": { $nin: ["pending", "running"] },
                generationJobId: { $in: [null, String(job.id)] },
              }),
        },
        {
          $set: {
            status: "generating",
            generationJobId: String(job.id),
            generationRunId: runId,
            ...(recoveryId ? { "recoveryIntent.state": "running" } : {}),
          },
          $push: activityPush(
            activityEntry("generation_started", "ai", "worker"),
          ),
        },
        { returnDocument: "after" },
      );
      if (!post) return;
      claimed = true;
      const content =
        post.creationMode === "manual" && !post.articleId
          ? { title: post.topic, description: post.topic, source: "topic" }
          : await FetchedContent.findOne({
              _id: post.articleId,
              linkedinMemberUrn,
            });
      if (!content) throw new Error("Content not found");
      const attemptId = recoveryId || String(job.id);
      let preferences = null;
      if (!post.text?.trim()) {
        if (post.writingPreferencesAttempt === attemptId) {
          preferences = post.writingPreferencesSnapshot
            ? validatePreferences(post.writingPreferencesSnapshot.toObject ? post.writingPreferencesSnapshot.toObject() : post.writingPreferencesSnapshot) : null;
        } else {
          preferences = await loadWritingPreferences(linkedinMemberUrn);
          const snapshot = await GeneratedPost.updateOne(scope, {
            $set: { writingPreferencesAttempt: attemptId, writingPreferencesSnapshot: preferences },
          });
          if (!snapshot.matchedCount) return;
        }
      }
      const result = post.text?.trim()
        ? {
            text: post.text,
            imagePrompt: post.imagePrompt || "",
            promptType: post.promptType,
            sourceType: post.sourceType,
          }
        : await aiService.generateForContent(
            content,
            post.creationMode === "manual" ? post.customPrompt : "",
            ...(preferences ? [preferences] : []),
          );
      if (!result.text?.trim()) throw new Error("AI empty response");
      if (
        post.creationMode !== "manual" &&
        (!post.publishAt ||
          !Number.isFinite(new Date(post.publishAt).getTime()))
      )
        throw new Error("Missing publishAt");
      const textFields = {
        text: result.text,
        imagePrompt: result.imagePrompt || "",
        promptType: result.promptType,
        sourceType: result.sourceType,
        title: content.title,
        url: content.url,
      };
      const saved = await GeneratedPost.updateOne(scope, { $set: textFields });
      if (!saved.matchedCount) return; // A newer execution fenced this worker out.
      let image = null,
        warning = false;
      if (result.imagePrompt?.trim()) {
        try {
          image = await imageGenerator.generate(result.imagePrompt, postId);
        } catch {
          warning = true;
          logger.warn("Image unavailable; using text-only post", {
            postId,
            code: "IMAGE_UNAVAILABLE",
          });
        }
      }
      const finalFields = {
        ...textFields,
        status: post.creationMode === "manual" ? "draft" : "queued",
        error: null,
        errorCode: null,
        failedStage: null,
        imagePath: image?.imagePath || "",
        imageUrl: "",
        imageStatus: image ? "generated" : "failed",
        ...(recoveryId ? { "recoveryIntent.state": "completed" } : {}),
      };
      const entries = [
        activityEntry(
          recoveryId ? "recovery_completed" : "generation_completed",
          "ai",
          "worker",
        ),
      ];
      if (warning)
        entries.unshift(
          activityEntry("image_unavailable_text_fallback", "image", "worker"),
        );
      const completed = await GeneratedPost.updateOne(scope, {
        $set: finalFields,
        $push: { activity: { $each: entries, $slice: -100 } },
      });
      if (
        completed.matchedCount &&
        post.creationMode !== "manual" &&
        !post.testMode &&
        !job.data.testMode
      )
        await enqueueCurrentPost({ ...post.toObject(), ...finalFields });
    } catch (error) {
      if (claimed) {
        const final = currentAttempt >= totalAttempts;
        await GeneratedPost.updateOne(scope, {
          $set: {
            status: final ? "failed" : "draft",
            error: "Content generation failed",
            errorCode: failureCode(error, "ai"),
            failedStage: "ai",
            lastFailedAt: new Date(),
            ...(recoveryId
              ? { "recoveryIntent.state": final ? "failed" : "pending" }
              : {}),
          },
          $push: activityPush(
            activityEntry(
              final && recoveryId ? "recovery_failed" : "generation_failed",
              "ai",
              "worker",
            ),
          ),
        });
      }
      logger.error("AI generation attempt failed", {
        postId,
        code: failureCode(error, "ai"),
        attempt: currentAttempt,
      });
      // BullMQ stores only a fixed, safe message, never a provider exception object.
      throw new Error(failureCode(error, "ai"));
    }
  },
  { connection: redisConnection.connection },
);
worker.on("failed", async (job) => {
  if (!job || job.attemptsMade < (job.opts?.attempts || 1)) return;
  try {
    await aiDLQ.add(
      "AI_JOB_FAILED",
      {
        postId: job.data.postId,
        linkedinMemberUrn: job.data.linkedinMemberUrn,
        reason: "AI_GENERATION_FAILED",
        attemptsMade: job.attemptsMade,
        failedAt: new Date(),
      },
      { jobId: `dlq-${job.data.postId}` },
    );
  } catch {
    logger.error("AI dead-letter enqueue unavailable", {
      postId: job.data.postId,
      code: "AI_DLQ_UNAVAILABLE",
    });
  }
});
export default worker;