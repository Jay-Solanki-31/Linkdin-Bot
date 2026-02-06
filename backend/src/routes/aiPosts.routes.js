import express from "express";
import GeneratedPost from "../models/generatedPost.model.js";


const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      GeneratedPost.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("articleId", "title source"),
      GeneratedPost.countDocuments(),
    ]);

    res.json({
      data: items.map((post) => ({
        _id: post._id,
        title: post.title,
        text: post.text,
        url: post.url,
        source: post.source,
        status: post.status,
        createdAt: post.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("AI Posts error:", err);
    res.status(500).json({ message: "Failed to fetch AI posts" });
  }
});


router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, text } = req.body;

    const post = await GeneratedPost.findById(id);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    if (["posted", "queued"].includes(post.status)) {
      return res.status(400).json({
        success: false,
        message: "This post cannot be edited right now",
      });
    }

    post.set({
      title: title ?? post.title,
      text: text ?? post.text,
    });

    await post.save();

    return res.json({
      success: true,
      data: post,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
