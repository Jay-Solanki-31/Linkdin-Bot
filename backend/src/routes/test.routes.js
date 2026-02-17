import { Router } from "express";
import FetchedContent from "../models/fetchedContent.model.js";
import GeneratedPost from "../models/generatedPost.model.js";
import { addAIJob } from "../queue/ai.queue.js";
import { enqueueSlotAllocation } from "../queue/slotAllocator.queue.js";
import { enqueueLinkedInPost } from "../queue/linkedin.queue.js";
import logger from "../utils/logger.js";

const router = Router();

// Clear all DB records
router.post("/clear-db", async (req, res) => {
  try {
    const fetchedResult = await FetchedContent.deleteMany({});
    const generatedResult = await GeneratedPost.deleteMany({});

    res.json({
      success: true,
      message: "All records cleared",
      deletedFetchedContent: fetchedResult.deletedCount,
      deletedGeneratedPosts: generatedResult.deletedCount,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Seed one dummy FetchedContent
router.post("/seed-content", async (req, res) => {
  try {
    const dummyContent = new FetchedContent({
      title: "Test Article: Node.js Best Practices",
      url: "https://example.com/test-" + Date.now(),
      description:
        "A comprehensive guide to Node.js best practices including error handling, async patterns, and performance optimization. Learn how to structure your applications for scalability and maintainability.",
      language: "en",
      source: "devto",
      timestamp: new Date(),
      status: "fetched",
    });

    const saved = await dummyContent.save();

    res.json({
      success: true,
      message: "Dummy content seeded",
      data: saved,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Manually enqueue slot allocation
router.post("/enqueue-slot-allocation", async (req, res) => {
  try {
    const job = await enqueueSlotAllocation();

    res.json({
      success: true,
      message: "Slot allocation job enqueued",
      jobId: job.id,
      jobName: job.name,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Manually enqueue AI generation for a content ID
router.post("/enqueue-ai/:contentId", async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!contentId) {
      return res.status(400).json({
        success: false,
        error: "contentId is required",
      });
    }

    const content = await FetchedContent.findById(contentId);
    if (!content) {
      return res.status(404).json({
        success: false,
        error: "Content not found",
      });
    }

    const job = await addAIJob(contentId);

    res.json({
      success: true,
      message: "AI generation job enqueued",
      jobId: job.id,
      contentId,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Manually enqueue LinkedIn posting for a post ID
router.post("/enqueue-publish/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        success: false,
        error: "postId is required",
      });
    }

    const post = await GeneratedPost.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    const job = await enqueueLinkedInPost(postId);

    res.json({
      success: true,
      message: "LinkedIn post job enqueued",
      jobId: job.id,
      postId,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// List all GeneratedPosts with their status
router.get("/posts-status", async (req, res) => {
  try {
    const posts = await GeneratedPost.find()
      .select("_id title text status slot createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(50);

    const summary = {
      total: posts.length,
      byStatus: {
        draft: posts.filter(p => p.status === "draft").length,
        queued: posts.filter(p => p.status === "queued").length,
        posted: posts.filter(p => p.status === "posted").length,
        failed: posts.filter(p => p.status === "failed").length,
      },
    };

    res.json({
      success: true,
      summary,
      posts,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// List all FetchedContent with their status
router.get("/content-status", async (req, res) => {
  try {
    const content = await FetchedContent.find()
      .select("_id title source status slot aiGenerated createdAt")
      .sort({ createdAt: -1 })
      .limit(50);

    const summary = {
      total: content.length,
      byStatus: {
        fetched: content.filter(c => c.status === "fetched").length,
        selected: content.filter(c => c.status === "selected").length,
        generated: content.filter(c => c.status === "generated").length,
        posted: content.filter(c => c.status === "posted").length,
        expired: content.filter(c => c.status === "expired").length,
      },
    };

    res.json({
      success: true,
      summary,
      content,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;

