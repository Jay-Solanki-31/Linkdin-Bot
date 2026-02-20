import { enqueueLinkedInPost } from "../queue/linkedin.queue.js";
import GeneratedPost from "../models/generatedPost.model.js";

export async function publishGeneratedPost(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Post ID is required",
      });
    }

    const post = await GeneratedPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.status === "posted") {
      return res.status(400).json({
        success: false,
        message: "Post already published",
      });
    }

    const job = await enqueueLinkedInPost(id);

    return res.status(202).json({
      success: true,
      message: "Post queued for publishing",
      jobId: job.id,
      postId: id,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}
