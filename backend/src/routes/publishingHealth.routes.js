import express from "express";
import mongoose from "mongoose";
import GeneratedPost from "../models/generatedPost.model.js";
import { safePost, eligibility, requestGenerationRecovery} from "../services/publishingHealth.service.js";
import { enqueueCurrentPost } from "../services/postScheduling.service.js";
import { activityEntry, activityPush } from "../utils/publishingDiagnostics.js";

const router = express.Router();

router.use((req, res, next) =>
  req.session?.linkedinMemberUrn
    ? next()
    : res.status(401).json({ message: "Session expired. Reconnect LinkedIn." }),
);

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (req.method === "GET") return next();
  if (req.body && Object.keys(req.body).length)
    return res.status(400).json({ message: "This action accepts no fields" });
  const now = Date.now();
  if (!req.session.healthRate || now - req.session.healthRate.start >= 60000)
    req.session.healthRate = { start: now, count: 0 };
  if (++req.session.healthRate.count > 10)
    return res.status(429).json({ message: "Please wait before trying again" });
  next();
});

router.param("postId", (req, res, next, id) =>
  mongoose.isObjectIdOrHexString(id)
    ? next()
    : res.status(400).json({ message: "Invalid post ID" }),
);
const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch {
    res
      .status(503)
      .json({
        message:
          "Publishing health is unavailable. Refresh to check current state.",
      });
  }
};
const owner = (req) => ({ linkedinMemberUrn: req.session.linkedinMemberUrn });
const page = (req) => {
  const n = Number(req.query.page || 1);
  if (!Number.isInteger(n) || n < 1 || n > 10000)
    throw new Error("Invalid page");
  return n;
};

router.get(
  "/summary",
  wrap(async (req, res) => {
    const asOf = new Date();
    const rows = await GeneratedPost.aggregate([
      { $match: { ...owner(req), createdAt: { $lte: asOf } } },
      {
        $group: {
          _id: {
            status: "$status",
            scheduled: {
              $and: [
                { $eq: ["$status", "queued"] },
                { $gt: ["$publishAt", asOf] },
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);
    const counts = {
      queued: 0,
      generating: 0,
      scheduled: 0,
      publishing: 0,
      published: 0,
      failed: 0,
      review_required: 0,
      draft: 0,
    };
    for (const row of rows) {
      const key = row._id.scheduled
        ? "scheduled"
        : row._id.status === "posted"
          ? "published"
          : row._id.status;
      if (key in counts) counts[key] += row.count;
    }
    res.json({
      counts,
      asOf,
      window: {
        from: null,
        to: asOf,
        basis:
          "All retained posts created at or before asOf; queued with future publishAt count only as scheduled",
      },
    });
  }),
);

router.get(
  "/incidents",
  wrap(async (req, res) => {
    const filter = { ...owner(req) };
    const allowed = [
      "draft",
      "queued",
      "generating",
      "publishing",
      "posted",
      "failed",
      "review_required",
      "scheduled",
    ];
    if (req.query.status) {
      if (!allowed.includes(req.query.status))
        return res.status(400).json({ message: "Invalid status" });
      if (req.query.status === "scheduled") {
        filter.status = "queued";
        filter.publishAt = { $gt: new Date() };
      } else filter.status = req.query.status;
    }
    if (req.query.stage) {
      if (!["ai", "ai_generation", "linkedin", "scheduling", "image"].includes(req.query.stage))
        return res.status(400).json({ message: "Invalid stage" });
      filter.failedStage = req.query.stage;
    }
    if (req.query.mode) {
      if (!["automatic", "manual"].includes(req.query.mode))
        return res.status(400).json({ message: "Invalid mode" });
      filter.creationMode =
        req.query.mode === "automatic" ? { $ne: "manual" } : "manual";
    }
    for (const key of ["from", "to"])
      if (req.query[key]) {
        const date = new Date(req.query[key]);
        if (!Number.isFinite(date.getTime()))
          return res.status(400).json({ message: "Invalid date" });
        filter.updatedAt = {
          ...filter.updatedAt,
          [key === "from" ? "$gte" : "$lte"]: date,
        };
      }
    if (filter.updatedAt?.$gte > filter.updatedAt?.$lte)
      return res.status(400).json({ message: "Invalid date range" });
    let currentPage;
    try {
      currentPage = page(req);
    } catch {
      return res.status(400).json({ message: "Invalid page" });
    }
    const [posts, total] = await Promise.all([
      GeneratedPost.find(filter)
        .sort({ lastFailedAt: -1, updatedAt: -1, _id: -1 })
        .skip((currentPage - 1) * 20)
        .limit(20)
        .lean(),
      GeneratedPost.countDocuments(filter),
    ]);
    res.json({
      data: posts.map(safePost),
      total,
      page: currentPage,
      pageSize: 20,
    });
  }),
);

router.get(
  "/posts/:postId/history",
  wrap(async (req, res) => {
    const post = await GeneratedPost.findOne({
      _id: req.params.postId,
      ...owner(req),
    })
      .select("activity")
      .lean();
    if (!post) return res.status(404).json({ message: "Post not found" });
    let currentPage;
    try {
      currentPage = page(req);
    } catch {
      return res.status(400).json({ message: "Invalid page" });
    }
    const events = [...(post.activity || [])].reverse();
    res.json({
      data: events.slice((currentPage - 1) * 20, currentPage * 20),
      total: events.length,
      page: currentPage,
      pageSize: 20,
    });
  }),
);

router.get(
  "/posts/:postId",
  wrap(async (req, res) => {
    const post = await GeneratedPost.findOne({
      _id: req.params.postId,
      ...owner(req),
    }).lean();
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({
      data: safePost(post),
      history: [...(post.activity || [])].reverse().slice(0, 20),
    });
  }),
);

router.post(
  "/posts/:postId/retry-generation",
  wrap(async (req, res) => {
    const result = await requestGenerationRecovery(
      req.params.postId,
      req.session.linkedinMemberUrn,
    );
    res.status(result.status).json({ message: result.message });
  }),
);

router.post(
  "/posts/:postId/reconcile-schedule",
  wrap(async (req, res) => {
    const filter = { _id: req.params.postId, ...owner(req) };
    const post = await GeneratedPost.findOne(filter);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (!eligibility(post).reconcileSchedule)
      return res
        .status(409)
        .json({ message: "Schedule reconciliation is not eligible" });
    await enqueueCurrentPost(post);
    await GeneratedPost.updateOne(
      {
        ...filter,
        status: "queued",
        scheduleVersion: post.scheduleVersion || { $in: [0, null] },
      },
      {
        $push: activityPush(
          activityEntry("schedule_reconciled", "scheduling", "user"),
        ),
      },
    );
    res
      .status(202)
      .json({
        message:
          "Schedule reconciliation requested. Publishing has not been confirmed.",
      });
  }),
);
export default router;

