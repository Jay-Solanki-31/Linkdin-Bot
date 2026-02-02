import GeneratedPost from "../models/generatedPost.model.js";
import { enqueueLinkedInPost } from "../queue/linkedin.queue.js";

export async function publishGeneratedPost(req, res) {
  try {
    const { id } = req.params;

    const post = await GeneratedPost.findOneAndUpdate(
      {
        _id: id,
        status: "draft",
        processing: { $ne: true },
      },
      {
        $set: {
          status: "queued",
          processing: true,
          processingAt: new Date(),
        },
      },
      { new: true }
    );

    if (!post) {
      return res.status(400).json({
        success: false,
        message: "Post not found or already queued",
      });
    }

    await enqueueLinkedInPost(post._id.toString());

    return res.status(202).json({
      success: true,
      message: "Post queued and publishing started",
      data: post,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}
