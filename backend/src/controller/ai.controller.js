import GeneratedPost from "../models/generatedPost.model.js";
import { addAIJob } from "../queue/ai.queue.js";

export const generateAIManually = async (req, res) => {
  const { postId } = req.params;

  if (!postId) {
    return res.status(400).json({
      success: false,
      error: "postId is required",
    });
  }

  const post = await GeneratedPost.findById(postId);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: "Post not found",
    });
  }

  const job = await addAIJob(postId);

  return res.json({
    success: true,
    message: "AI generation job queued",
    jobId: job.id,
    postId,
  });
};
