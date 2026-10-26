import GeneratedPost from "../models/generatedPost.model.js";
import { linkedinQueue } from "../queue/linkedin.queue.js";

export async function enqueueCurrentPost(post) {
  return linkedinQueue.add("POST_TO_LINKEDIN", {
    postId: String(post._id), linkedinMemberUrn: post.linkedinMemberUrn,
    scheduleVersion: post.scheduleVersion || 0,
  }, { jobId: `publish-${post._id}-v${post.scheduleVersion || 0}`, delay: Math.max(0, new Date(post.publishAt).getTime() - Date.now()) });
}

export async function removeOldPublishJobs(post) {
  for (const id of [`publish-${post._id}-v${post.scheduleVersion || 0}`, `linkedin-${post._id}`, `linkedin-post-${post._id}`]) {
    const job = await linkedinQueue.getJob(id);
    if (job && await job.getState() !== "active") await job.remove();
  }
}

export async function recoverPublishSchedules() {
  await GeneratedPost.updateMany({ status: "publishing", updatedAt: { $lt: new Date(Date.now() - 30 * 60000) } }, { $set: { status: "review_required", error: "Publishing interrupted. Verify LinkedIn before taking further action." } });
  const posts = await GeneratedPost.find({ status: "queued", testMode: { $ne: true }, publishAt: { $type: "date" }, linkedinMemberUrn: { $type: "string" } });
  for (const post of posts) await enqueueCurrentPost(post);
}
