import { boundedQueue } from "../utils/boundedQueue.js";
import GeneratedPost from "../models/generatedPost.model.js";
import { aiQueue } from "../queue/ai.queue.js";
import logger from "../utils/logger.js";
import { activityEntry, activityPush } from "../utils/publishingDiagnostics.js";
export const REVIEW_MESSAGE =
  "Publishing outcome could not be confirmed. Check LinkedIn before taking further action.";
export function safeDiagnostic(post) {
  if (post.status === "review_required") return REVIEW_MESSAGE;
  if (post.errorCode === "LINKEDIN_TOKEN_EXPIRED")
    return "LinkedIn connection expired. Reconnect your account.";
  if (["ai", "ai_generation"].includes(post.failedStage))
    return "Content generation failed. A retry may be available.";
  if (post.failedStage === "linkedin")
    return "Publishing failed. Review this post before taking further action.";
  return post.status === "failed"
    ? "Processing failed. Review this post before taking further action."
    : null;
}

export function eligibility(post, now = Date.now()) {
  const pending = ["pending", "running"].includes(post.recoveryIntent?.state);
  return {
    retryGeneration:
      !pending &&
      ["draft", "failed"].includes(post.status) &&
      ["ai", "ai_generation"].includes(post.failedStage) &&
      !post.linkedinPostUrn &&
      !post.publishAttemptedAt &&
      (post.recoveryAttempts || 0) < 3 &&
      (!post.lastRecoveryAt ||
        now - new Date(post.lastRecoveryAt).getTime() >= 60000),
    reconcileSchedule:
      post.status === "queued" &&
      !post.linkedinPostUrn &&
      !post.publishAttemptedAt &&
      !post.testMode &&
      new Date(post.publishAt).getTime() > now,
    recoveryPending: pending,
  };
}
export function safePost(post) {
  return {
    id: String(post._id),
    title: post.title || post.topic || "Untitled post",
    creationMode: post.creationMode || "automatic",
    status: post.status,
    failedStage: post.failedStage,
    errorCode: post.errorCode,
    errorMessage: safeDiagnostic(post),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    publishAt: post.publishAt,
    postedAt: post.postedAt,
    lastFailedAt: post.lastFailedAt,
    publishAttemptedAt: post.publishAttemptedAt,
    lastRecoveryAt: post.lastRecoveryAt,
    recoveryAttempts: post.recoveryAttempts || 0,
    eligibility: eligibility(post),
  };
}
export async function dispatchRecovery(post) {
  const id = post.recoveryIntent.id;
  const job = await boundedQueue(() => aiQueue.getJob(id));
  if (job) {
    if (
      ["failed", "completed"].includes(await boundedQueue(() => job.getState()))
    )
      await GeneratedPost.updateOne(
        {
          _id: post._id,
          linkedinMemberUrn: post.linkedinMemberUrn,
          "recoveryIntent.id": id,
          "recoveryIntent.state": "pending",
        },
        {
          $set: {
            "recoveryIntent.state": "failed",
            status: "failed",
            failedStage: "ai",
            errorCode: "AI_RECOVERY_INTERRUPTED",
            lastFailedAt: new Date(),
          },
          $push: activityPush(activityEntry("recovery_failed", "ai")),
        },
      );
    return;
  }
  await boundedQueue(() =>
    aiQueue.add(
      "GENERATE_POST",
      {
        postId: String(post._id),
        linkedinMemberUrn: post.linkedinMemberUrn,
        recoveryId: id,
      },
      { jobId: id },
    ),
  );
}
export async function requestGenerationRecovery(postId, linkedinMemberUrn) {
  logger.info("Generation recovery eligibility requested", {
    postId: String(postId),
  });
  const post = await GeneratedPost.findOne({ _id: postId, linkedinMemberUrn });
  if (!post) return { status: 404, message: "Post not found" };
  if (["pending", "running"].includes(post.recoveryIntent?.state))
    return { status: 202, message: "Recovery is pending" };
  if (!eligibility(post).retryGeneration)
    return {
      status: 409,
      message: "Generation recovery is not currently eligible",
    };
  const existing = await boundedQueue(() => aiQueue.getJob(`ai-${postId}`));
  if (
    existing &&
    !["completed", "failed"].includes(
      await boundedQueue(() => existing.getState()),
    )
  )
    return { status: 409, message: "Generation is already queued" };
  const recoveryId = `health-ai-${postId}-${(post.recoveryAttempts || 0) + 1}`;
  const claimed = await GeneratedPost.findOneAndUpdate(
    {
      _id: postId,
      linkedinMemberUrn,
      status: post.status,
      failedStage: post.failedStage,
      linkedinPostUrn: null,
      publishAttemptedAt: null,
      recoveryAttempts: post.recoveryAttempts ?? { $in: [0, null] },
      "recoveryIntent.state": { $nin: ["pending", "running"] },
      $or: [
        { lastRecoveryAt: null },
        { lastRecoveryAt: { $lte: new Date(Date.now() - 60000) } },
      ],
    },
    {
      $set: {
        recoveryIntent: {
          id: recoveryId,
          state: "pending",
          requestedAt: new Date(),
        },
        lastRecoveryAt: new Date(),
      },
      $inc: { recoveryAttempts: 1 },
      $push: activityPush(activityEntry("recovery_requested", "ai", "user")),
    },
    { returnDocument: "after" },
  );
  if (!claimed)
    return {
      status: 409,
      message: "Post changed. Refresh before trying again.",
    };
  try {
    await dispatchRecovery(claimed);
  } catch {
    logger.warn("Generation recovery enqueue deferred", {
      postId: String(postId),
      code: "RECOVERY_QUEUE_UNAVAILABLE",
    });
  }
  return {
    status: 202,
    message: "Recovery requested. Check activity for completion.",
  };
}
export async function reconcileRecoveryIntents() {
  const interrupted = await GeneratedPost.find({
    "recoveryIntent.state": "running",
    status: "generating",
    updatedAt: { $lt: new Date(Date.now() - 30 * 60000) },
  }).limit(100);
  for (const post of interrupted) {
    try {
      const job = await boundedQueue(() =>
        aiQueue.getJob(post.recoveryIntent.id),
      );
      if (
        job &&
        !["completed", "failed"].includes(
          await boundedQueue(() => job.getState()),
        )
      )
        continue;
      await GeneratedPost.updateOne(
        {
          _id: post._id,
          linkedinMemberUrn: post.linkedinMemberUrn,
          status: "generating",
          updatedAt: post.updatedAt,
          "recoveryIntent.id": post.recoveryIntent.id,
        },
        {
          $set: {
            status: "failed",
            failedStage: "ai",
            errorCode: "AI_INTERRUPTED",
            lastFailedAt: new Date(),
            "recoveryIntent.state": "failed",
          },
          $push: activityPush(activityEntry("recovery_failed", "ai")),
        },
      );
    } catch {
      logger.warn("Interrupted recovery reconciliation deferred", {
        code: "RECOVERY_QUEUE_UNAVAILABLE",
      });
    }
  }
  const posts = await GeneratedPost.find({
    "recoveryIntent.state": "pending",
    status: { $in: ["failed", "draft"] },
    linkedinPostUrn: null,
    publishAttemptedAt: null,
  }).limit(100);
  for (const post of posts) {
    try {
      await dispatchRecovery(post);
    } catch {
      logger.warn("Recovery intent remains pending", {
        postId: String(post._id),
        code: "RECOVERY_QUEUE_UNAVAILABLE",
      });
      break;
    }
  }
}
