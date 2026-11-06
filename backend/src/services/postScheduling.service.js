import { boundedQueue } from "../utils/boundedQueue.js";
import GeneratedPost from "../models/generatedPost.model.js";
import { linkedinQueue } from "../queue/linkedin.queue.js";
import { activityEntry, activityPush } from "../utils/publishingDiagnostics.js";
import logger from "../utils/logger.js";

export async function enqueueCurrentPost(post) {
  if (
    post.status !== "queued" ||
    post.linkedinPostUrn ||
    post.publishAttemptedAt ||
    post.testMode ||
    !post.linkedinMemberUrn ||
    !Number.isFinite(new Date(post.publishAt).getTime())
  )
    return;
  // Recheck persisted version; any race after this read is rejected by the worker.
  if (
    !(await GeneratedPost.exists({
      _id: post._id,
      linkedinMemberUrn: post.linkedinMemberUrn,
      status: "queued",
      linkedinPostUrn: null,
      publishAttemptedAt: null,
      publishAt: post.publishAt,
      scheduleVersion: post.scheduleVersion || { $in: [0, null] },
    }))
  )
    return;
  const currentId = `publish-${post._id}-v${post.scheduleVersion || 0}`;
  for (const id of [
    currentId,
    `linkedin-${post._id}`,
    `linkedin-post-${post._id}`,
  ]) {
    const existing = await boundedQueue(() => linkedinQueue.getJob(id));
    if (!existing) continue;
    if (
      id !== currentId &&
      (existing.data?.scheduleVersion || 0) !== (post.scheduleVersion || 0)
    )
      continue;
    const state = await boundedQueue(() => existing.getState());
    if (["completed", "failed"].includes(state)) {
      // Preserve retained queue failures and budgets. Never report terminal jobs
      // as restored schedules or reset them to bypass the existing retry limit.
      await GeneratedPost.updateOne(
        {
          _id: post._id,
          linkedinMemberUrn: post.linkedinMemberUrn,
          status: "queued",
          linkedinPostUrn: null,
          publishAttemptedAt: null,
          scheduleVersion: post.scheduleVersion || { $in: [0, null] },
        },
        {
          $set: {
            status: "failed",
            failedStage: "scheduling",
            errorCode: "SCHEDULE_JOB_TERMINAL",
            lastFailedAt: new Date(),
            error:
              "Scheduled execution ended without confirmed publishing. Review the post.",
          },
          $push: activityPush(
            activityEntry("schedule_reconciliation_failed", "scheduling"),
          ),
        },
      );
    }
    return;
  }
  return boundedQueue(() =>
    linkedinQueue.add(
      "POST_TO_LINKEDIN",
      {
        postId: String(post._id),
        linkedinMemberUrn: post.linkedinMemberUrn,
        scheduleVersion: post.scheduleVersion || 0,
      },
      {
        jobId: `publish-${post._id}-v${post.scheduleVersion || 0}`,
        delay: Math.max(0, new Date(post.publishAt).getTime() - Date.now()),
      },
    ),
  );
}

export async function removeOldPublishJobs(post) {
  for (const id of [
    `publish-${post._id}-v${post.scheduleVersion || 0}`,
    `linkedin-${post._id}`,
    `linkedin-post-${post._id}`,
  ]) {
    const job = await boundedQueue(() => linkedinQueue.getJob(id));
    if (job && (await boundedQueue(() => job.getState())) !== "active")
      await job.remove();
  }
}

export async function recoverPublishSchedules() {
  await GeneratedPost.updateMany(
    {
      status: "publishing",
      updatedAt: { $lt: new Date(Date.now() - 30 * 60000) },
    },
    {
      $set: {
        status: "review_required",
        failedStage: "linkedin",
        lastFailedAt: new Date(),
        error:
          "Publishing interrupted. Verify LinkedIn before taking further action.",
      },
      $push: activityPush(activityEntry("review_required", "linkedin")),
    },
  );
  const posts = await GeneratedPost.find({
    status: "queued",
    testMode: { $ne: true },
    linkedinPostUrn: null,
    publishAttemptedAt: null,
    publishAt: { $type: "date" },
    linkedinMemberUrn: { $type: "string" },
  });
  for (const post of posts) {
    try {
      await enqueueCurrentPost(post);
    } catch {
      logger.warn("Schedule reconciliation deferred", {
        postId: String(post._id),
        code: "SCHEDULE_QUEUE_UNAVAILABLE",
      });
      break;
    }
  }
}
