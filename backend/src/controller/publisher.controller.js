import { enqueueLinkedInPost } from "../queue/linkedin.queue.js";

export async function publishGeneratedPost(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Post ID is required",
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
