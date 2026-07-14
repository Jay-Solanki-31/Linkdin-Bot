import express from "express";
import GeneratedPost from "../models/generatedPost.model.js";
import { linkedinQueue } from "../queue/linkedin.queue.js";
import logger from "../utils/logger.js";


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
        articleId: post.articleId,
        title: post.title,
        text: post.text,
        url: post.url,
        status: post.status,
        attempts: post.attempts,
        publishAt: post.publishAt,   
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
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

    if (post.status === "posted") {
      return res.status(400).json({
        success: false,
        message: "Published posts cannot be edited",
      });
    }

    if (post.status !== "queued") {
      return res.status(400).json({
        success: false,
        message: "Only queued posts can be edited",
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

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

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
        message: "Posted content cannot be deleted",
      });
    }

    // remove BullMQ delayed job
    const job = await linkedinQueue.getJob(`linkedin-${id}`);

    if (job) {
      await job.remove();

      logger.info(`Removed BullMQ job for post ${id}`);
    }

    await post.deleteOne();

    return res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (err) {
    console.error("Delete AI Post error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete post",
    });
  }
});


export default router;
