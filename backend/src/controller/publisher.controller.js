import GeneratedPost from "../models/generatedPost.model.js";
import { enqueueLinkedInPost } from "../queue/linkedin.queue.js";

export async function publishGeneratedPost(req, res) {
  try {
    const { id } = req.params;

    const post = await GeneratedPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: `Post is already ${post.status}`,
      });
    }

    
    post.status = "queued";
    await post.save();

    await enqueueLinkedInPost(post._id);

    return res.status(202).json({
      success: true,
      message: "Post queued for LinkedIn",
      data: post,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}
