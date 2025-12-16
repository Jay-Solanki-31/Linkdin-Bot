import express from "express";
import FetchedContent from "../models/fetchedContent.model.js";

const router = express.Router();

const resolveAIStatus = (doc) => {
  if (doc.aiError) return "failed";
  if (doc.processing) return "processing";
  if (doc.aiGenerated) return "generated";
  if (doc.isQueued) return "queued";
  return "pending";
};

router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { aiGenerated: true },
        { isQueued: true },
        { processing: true },
        { aiError: { $ne: null } },
      ],
    };

    const [items, total] = await Promise.all([
      FetchedContent.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("title description aiGenerated isQueued processing aiError createdAt"),
      FetchedContent.countDocuments(filter),
    ]);

    const data = items.map(doc => ({
      _id: doc._id,
      title: doc.title,
      description: doc.description,
      createdAt: doc.createdAt,
      status: resolveAIStatus(doc),
    }));

    res.json({
      data,
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
