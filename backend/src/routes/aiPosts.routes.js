import express from "express";
import fs from "fs";
import path from "path";
import GeneratedPost from "../models/generatedPost.model.js";
import { linkedinQueue } from "../queue/linkedin.queue.js";
import logger from "../utils/logger.js";

const router = express.Router();

const getMemberUrn = (req) => req.session?.linkedinMemberUrn;

const getImageUrl = (req, imagePath) => {
  if (!imagePath || typeof imagePath !== "string") {
    return null;
  }

  if (/^https?:\/\//.test(imagePath)) {
    return imagePath;
  }

  const normalized = imagePath.replace(/\\/g, "/");
  const uploadsIndex = normalized.indexOf("/uploads/");
  const pathPart = uploadsIndex >= 0
    ? normalized.substring(uploadsIndex)
    : `/${path.relative(process.cwd(), imagePath).replace(/\\/g, "/")}`;

  if (!req || !req.protocol || !req.get) {
    return pathPart;
  }

  const host = req.get("host");
  return `${req.protocol}://${host}${pathPart}`;
};

router.get("/", async (req, res) => {
  try {
    const linkedinMemberUrn = getMemberUrn(req);
    if (!linkedinMemberUrn) {
      return res.status(401).json({ message: "LinkedIn account is not connected" });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 10, 50));
    const skip = (page - 1) * limit;
    
    const [items, total, statusCounts] = await Promise.all([
      GeneratedPost.find({ linkedinMemberUrn })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("articleId", "title source"),
      GeneratedPost.countDocuments({ linkedinMemberUrn }),
      GeneratedPost.aggregate([
        { $match: { linkedinMemberUrn } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const counts = statusCounts.reduce(
      (result, entry) => ({ ...result, [entry._id]: entry.count }),
      { posted: 0, queued: 0, failed: 0 }
    );

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
        timezone: post.timezone,
        creationMode: post.creationMode || "automatic",
        testMode: post.testMode,
        error: post.error,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        imagePath: post.imagePath,
        imageUrl: getImageUrl(req, post.imagePath),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts: counts,
    });
  } catch (err) {
    console.error("AI Posts error:", err);
    res.status(500).json({ message: "Failed to fetch AI posts" });
  }
});


router.put("/:id", async (req, res) => {
  try {
    const linkedinMemberUrn = getMemberUrn(req);
    if (!linkedinMemberUrn) {
      return res.status(401).json({ success: false, message: "LinkedIn account is not connected" });
    }

    const { id } = req.params;
    const { title, text } = req.body;

    const post = await GeneratedPost.findOne({ _id: id, linkedinMemberUrn });
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

    if (!["draft", "queued"].includes(post.status)) {
      return res.status(400).json({
        success: false,
        message: "Only queued posts can be edited",
      });
    }

    if ((text !== undefined && (typeof text !== "string" || !text.trim() || text.length > 3000)) || (title !== undefined && (typeof title !== "string" || title.length > 300))) return res.status(400).json({message: "Invalid post text or title"});
    const updated = await GeneratedPost.findOneAndUpdate({ _id: id, linkedinMemberUrn, status: { $in: ["draft", "queued"] } }, { $set: { text: text ?? post.text, title: title ?? post.title } }, { returnDocument: "after" });
    if (!updated) return res.status(409).json({message: "Post is no longer editable"});
    return res.json({success: true, data: updated});

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update post",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const linkedinMemberUrn = getMemberUrn(req);
    if (!linkedinMemberUrn) {
      return res.status(401).json({ success: false, message: "LinkedIn account is not connected" });
    }

    const { id } = req.params;

    const post = await GeneratedPost.findOne({ _id: id, linkedinMemberUrn });
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

    if (!["draft", "queued", "failed"].includes(post.status)) return res.status(409).json({message: "This post cannot be deleted"});
    const removed = await GeneratedPost.findOneAndDelete({ _id: id, linkedinMemberUrn, status: { $in: ["draft", "queued", "failed"] } });
    if (!removed) return res.status(409).json({message: "Post changed; refresh before deleting"});
    // remove BullMQ delayed job
    for (const jobId of [`linkedin-post-${id}`, `linkedin-${id}`]) {
      const job = await linkedinQueue.getJob(jobId);
      if (job) {
        await job.remove();
        logger.info(`Removed BullMQ job for post ${id}`);
      }
    }

    if (post.imagePath && fs.existsSync(post.imagePath)) {
      try {
        fs.unlinkSync(post.imagePath);
        logger.info(`Deleted image file for post ${id}: ${post.imagePath}`);
      } catch (err) {
        logger.warn(`Failed to delete image file for post ${id}: ${err.message}`);
      }
    }



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
