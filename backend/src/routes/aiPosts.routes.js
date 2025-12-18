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
      data: items.map(post => ({
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

export default router;
