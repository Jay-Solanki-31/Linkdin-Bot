import GeneratedPost from "../models/generatedPost.model.js";

export const queueGeneratedPost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await GeneratedPost.findOneAndUpdate(
      { _id: id, status: "draft" },
      { status: "queued" },
      { new: true }
    );

    if (!post) {
      return res.status(400).json({
        success: false,
        message: "Only draft posts can be queued",
      });
    }

    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
