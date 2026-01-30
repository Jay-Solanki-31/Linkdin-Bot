import GeneratedPost from "../models/generatedPost.model.js";

export async function publishGeneratedPost(req, res) {
  try {
    const { id } = req.params;

    const post = await GeneratedPost.findOneAndUpdate(
      {
        _id: id,
        status: "draft",
      },
      {
        $set: { status: "queued" },
      },
      { new: true }
    );

    if (!post) {
      return res.status(400).json({
        success: false,
        message: "Post not found or already queued",
      });
    }

    return res.status(202).json({
      success: true,
      message: "Post queued for scheduled publishing",
      data: post,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}
