import GeneratedPost from "../models/generatedPost.model.js";
import { addAIJob } from "../queue/ai.queue.js";
import { requireAuthenticatedMemberUrn } from "../utils/authenticatedAccount.js";

export const generateAIManually = async (req, res) => {
  const { postId } = req.params;
  const linkedinMemberUrn = requireAuthenticatedMemberUrn(req, res);
  if (!linkedinMemberUrn) return;

  if (!postId) {
    return res.status(400).json({
      success: false,
      error: "postId is required",
    });
  }

  const post = await GeneratedPost.findOne({ _id: postId, linkedinMemberUrn });
  if (!post) {
    return res.status(404).json({
      success: false,
      error: "Post not found",
    });
  }

  const job = await addAIJob(postId, linkedinMemberUrn);

  return res.json({
    success: true,
    message: "AI generation job queued",
    jobId: job.id,
    postId,
  });
};
