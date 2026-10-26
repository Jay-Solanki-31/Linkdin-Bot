import express from "express";
import mongoose from "mongoose";
import GeneratedPost from "../models/generatedPost.model.js";
import FetchedContent from "../models/fetchedContent.model.js";
import LinkedInToken from "../models/linkedinToken.model.js";
import { aiQueue } from "../queue/ai.queue.js";
import { scheduleTime, validateTimezone } from "../utils/scheduleTime.js";
import { enqueueCurrentPost, removeOldPublishJobs } from "../services/postScheduling.service.js";

const router = express.Router();


router.use((req, res, next) => req.session?.linkedinMemberUrn ? next() : res.status(401).json({ message: "LinkedIn account is not connected" }));
// Bounded per-session throttling. Distributed deployments should use a shared limiter.

router.use((req, res, next) => {
  if (req.method === "GET") return next();
  const now = Date.now();
  const rate = req.session.studioRate;
  if (!rate || now - rate.start > 60000) req.session.studioRate = { start: now, count: 0 };
  if (++req.session.studioRate.count > 15) return res.status(429).json({ message: "Please wait before trying again" });
  next();
});

const safe = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (error) {
    if (error.name === "CastError" || error.name === "ValidationError") return res.status(400).json({ message: "Invalid request" });
    console.error("Studio request failed", error.message);
    res.status(503).json({ message: "Operation could not complete. Refresh to check the current status." });
  }
};
const owner = req => ({ linkedinMemberUrn: req.session.linkedinMemberUrn });
const editable = { status: { $in: ["draft", "queued"] }, linkedinPostUrn: null };


router.get("/automation/settings", safe(async (req, res) => {
  const account = await LinkedInToken.findOne({ memberUrn: req.session.linkedinMemberUrn });
  res.json({ automationEnabled: account?.automationEnabled !== false, timezone: account?.timezone || "Asia/Kolkata", schedule: "Sunday 11 AM fetch; Monday 10 AM allocation. Monday 11 AM–1 PM, Tuesday–Friday 9–11 AM, Asia/Kolkata. Existing queued posts remain scheduled when automation is disabled." });
}));


router.patch("/automation/settings", safe(async (req, res) => {
  const { automationEnabled, timezone } = req.body;
  if (typeof automationEnabled !== "boolean") return res.status(400).json({ message: "automationEnabled must be boolean" });
  try { validateTimezone(timezone); } catch (e) { return res.status(400).json({ message: e.message }); }
  await LinkedInToken.updateOne({ memberUrn: req.session.linkedinMemberUrn }, { $set: { automationEnabled, timezone } });
  res.json({ automationEnabled, timezone });
}));

router.post("/ai-posts/generate", safe(async (req, res) => {
  const { articleId, topic, customPrompt = "" } = req.body;
  if (typeof customPrompt !== "string" || customPrompt.length > 4000 || (!articleId && (typeof topic !== "string" || !topic.trim() || topic.length > 2000))) return res.status(400).json({ message: "Provide an article or a topic, and a prompt up to 4000 characters" });
  if (articleId && !mongoose.isValidObjectId(articleId)) return res.status(400).json({ message: "Invalid article ID" });
  if (articleId && !await FetchedContent.exists({ _id: articleId, ...owner(req) })) return res.status(404).json({ message: "Article not found" });
  // Retain the existing one-post-per-article constraint, including manual drafts.
  if (articleId && await GeneratedPost.exists({ articleId, ...owner(req) })) return res.status(409).json({ message: "This article already has a post" });
  const post = await GeneratedPost.create({ ...owner(req), ...(articleId ? { articleId } : { topic: topic.trim() }), customPrompt, creationMode: "manual", status: "draft" });
  await aiQueue.add("GENERATE_POST", { postId: String(post._id), ...owner(req) }, { jobId: `ai-${post._id}` });
  res.status(202).json({ data: post, message: "Generation queued; the result will remain a draft" });
}));


router.get("/ai-posts/:id", safe(async (req, res) => {
  const post = await GeneratedPost.findOne({ _id: req.params.id, ...owner(req) });
  res.status(post ? 200 : 404).json(post ? { data: post } : { message: "Post not found" });
}));


router.route("/ai-posts/:id").patch( safe(async (req, res) => {
  const { text, title } = req.body;
  if (typeof text !== "string" || !text.trim() || text.length > 3000 || (title !== undefined && (typeof title !== "string" || title.length > 300))) return res.status(400).json({ message: "Text must contain 1–3000 characters" });
  const post = await GeneratedPost.findOneAndUpdate({ _id: req.params.id, ...owner(req), ...editable }, { $set: { text: text.trim(), ...(title !== undefined ? { title } : {}) } }, { returnDocument: "after" });
  res.status(post ? 200 : 409).json(post ? { data: post } : { message: "Post is missing or cannot be edited" });
}));



router.post("/ai-posts/:id/regenerate", safe(async (req, res) => {
  const customPrompt = req.body.customPrompt || "";
  if (typeof customPrompt !== "string" || customPrompt.length > 4000) return res.status(400).json({ message: "Invalid prompt" });
  const post = await GeneratedPost.findOneAndUpdate({ _id: req.params.id, ...owner(req), creationMode: "manual", status: "draft" }, { $set: { status: "generating", text: "", customPrompt } }, { returnDocument: "after" });
  if (!post) return res.status(409).json({ message: "Only manual drafts can be regenerated" });
  await GeneratedPost.updateOne({ _id: post._id, ...owner(req), status: "generating" }, { $set: { status: "draft" } });
  await aiQueue.add("GENERATE_POST", { postId: String(post._id), ...owner(req) }, { jobId: `regenerate-${post._id}-${post.updatedAt.getTime()}` });
  res.status(202).json({ message: "Regeneration queued" });
}));

export async function changeSchedule(req, res) {
  const immediate = req.path.endsWith("/publish");
  const cancel = req.path.endsWith("/cancel");
  const body = req.body || {};
  const account = !body.timezone && !immediate && !cancel ? await LinkedInToken.findOne({ memberUrn: req.session.linkedinMemberUrn }) : null;
  let publishAt, timezone = body.timezone || account?.timezone || "Asia/Kolkata";
  if (!cancel) {
    try { publishAt = immediate ? new Date() : scheduleTime(body.localTime, timezone); }
    catch (e) { return res.status(400).json({ message: e.message }); }
  }
  const old = await GeneratedPost.findOne({ _id: req.params.id, ...owner(req) });
  if (!old) return res.status(404).json({ message: "Post not found" });
  if (old.testMode) return res.status(409).json({ message: "Test posts cannot be published or scheduled. Create a new manual draft." });
  if (!cancel && !old.text?.trim()) return res.status(409).json({ message: "Generate and review text first" });
  const post = await GeneratedPost.findOneAndUpdate({ _id: old._id, ...owner(req), ...editable, scheduleVersion: old.scheduleVersion || { $in: [0, null] } }, { $set: { status: cancel ? "draft" : "queued", ...(cancel ? {} : { publishAt, timezone }) }, ...(cancel ? { $unset: { publishAt: "" } } : {}), $inc: { scheduleVersion: 1 } }, { returnDocument: "after" });
  if (!post) return res.status(409).json({ message: "Post changed or publishing has started; refresh before trying again" });
  await removeOldPublishJobs(old);
  if (!cancel) await enqueueCurrentPost(post);
  const conflict = !cancel && await GeneratedPost.exists({ ...owner(req), _id: { $ne: post._id }, status: { $in: ["queued", "publishing", "posted"] }, publishAt: { $gte: new Date(publishAt.getTime() - 86400000), $lte: new Date(publishAt.getTime() + 86400000) } });
  res.status(cancel ? 200 : 202).json({ data: post, warning: conflict ? "Another post is scheduled within 24 hours. Both posts are preserved." : null });
}
for (const action of ["schedule", "publish", "cancel"]) router.post(`/ai-posts/:id/${action}`, safe(changeSchedule));
router.patch("/ai-posts/:id/schedule", safe(changeSchedule));
export default router;
