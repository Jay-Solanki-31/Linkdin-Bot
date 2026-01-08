import { enqueueLinkedInPost } from "../queue/linkedin.queue.js";
import GeneratedPost from "../models/generatedPost.model.js";
import { publishToLinkedIn } from "../modules/publisher/linkedin.publisher.js";


export async function postGenerated(req, res) {
  try {
    const { postId } = req.body;

    await enqueueLinkedInPost(postId);

    res.json({
      success: true,
      message: "Post queued for LinkedIn",
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
}

// this  is  for a test  single post  to run manually
export async function publishOneDraftPost(req, res) {
  try {
    const post = await GeneratedPost.findOneAndUpdate(
      { status: "draft" },
      { $set: { status: "publishing" } },
      { sort: { createdAt: 1 }, returnDocument: "after" }
    );

    if (!post) {
      return res.json({
        success: true,
        message: "No draft posts available"
      });
    }

    const result = await publishToLinkedIn({
      text: post.text
    });

    post.status = "posted";
    await post.save();

    return res.json({
      success: true,
      posted: true,
      postId: post._id,
      linkedin: result.data
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.response?.data || err.message
    });
  }
}
