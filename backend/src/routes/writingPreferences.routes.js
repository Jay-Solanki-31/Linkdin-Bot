import express from "express";
import Preferences from "../models/aiWritingPreferences.model.js";
import {
  defaultPreferences,
  OPTIONS,
  validatePreferences,
} from "../utils/writingPreferences.js";
import { requireAuthenticatedMemberUrn } from "../utils/authenticatedAccount.js";
import aiService from "../modules/ai/ai.service.js";
import { redisConnection } from "../queue/connection.js";

const router = express.Router();


router.use((req, res, next) => {
  if (requireAuthenticatedMemberUrn(req, res)) next();
});

const safe = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error.code === 11000)
      return res
        .status(409)
        .json({ message: "Preferences changed. Reload before saving." });
    res
      .status(503)
      .json({ message: "Unable to complete the request. Please try again." });
  }
};


router.get(
  "/",
  safe(async (req, res) => {
    const doc = await Preferences.findById(
      req.session.linkedinMemberUrn,
    ).lean();
    res.json({
      preferences: doc
        ? validatePreferences(doc.preferences)
        : defaultPreferences(),
      revision: doc?.revision || 0,
      defaults: defaultPreferences(),
      options: OPTIONS,
    });
  }),
);


router.put(
  "/",
  safe(async (req, res) => {
    let preferences;
    try {
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
        throw new Error("Invalid preferences request");
      if (
        Object.keys(req.body).some(
          (k) => !["preferences", "revision"].includes(k),
        ) ||
        !Number.isSafeInteger(req.body.revision) ||
        req.body.revision < 0
      )
        throw new Error("Invalid preferences request");
      preferences = validatePreferences(req.body.preferences);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    const _id = req.session.linkedinMemberUrn;
    let doc;
    if (req.body.revision === 0)
      doc = await Preferences.create({ _id, preferences, revision: 1 });
    else
      doc = await Preferences.findOneAndUpdate(
        { _id, revision: req.body.revision },
        { $set: { preferences }, $inc: { revision: 1 } },
        { returnDocument: "after", runValidators: true },
      );
    if (!doc)
      return res
        .status(409)
        .json({ message: "Preferences changed. Reload before saving." });
    res.json({
      preferences: validatePreferences(
        doc.preferences.toObject ? doc.preferences.toObject() : doc.preferences,
      ),
      revision: doc.revision,
    });
  }),
);


router.post(
  "/preview",
  safe(async (req, res) => {
    let preferences;
    try {
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
        throw new Error("Invalid preview request");
      if (
        Object.keys(req.body).some((k) => !["preferences", "topic"].includes(k))
      )
        throw new Error("Unknown preview field");
      preferences = validatePreferences(req.body.preferences);
      if (
        typeof req.body.topic !== "string" ||
        !req.body.topic.trim() ||
        req.body.topic.length > 2000
      )
        throw new Error("Enter a preview topic of 1–2000 characters");
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    // Shared Redis limiter covers concurrent requests, sessions and app instances.
    const key = `writing-preview:${req.session.linkedinMemberUrn}:${Math.floor(Date.now() / 60000)}`;
    const redis = redisConnection.connection;
    if (redis.status && redis.status !== "ready")
      throw new Error("Preview limiter unavailable");
    let timer;
    let count;
    try {
      count = await Promise.race([
        redis.eval(
          "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],120) end; return n",
          1,
          key,
        ),
        new Promise((resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error("Preview limiter timeout")),
            3000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
    if (count > 5)
      return res
        .status(429)
        .json({ message: "Preview limit reached. Try again in a minute." });
    try {
      const result = await aiService.generateForContent(
        {
          title: req.body.topic.trim(),
          description: req.body.topic.trim(),
          source: "topic",
        },
        "",
        preferences,
      );
      res.json({ text: result.text });
    } catch (e) {
      const timeout = e.code === "AI_TIMEOUT";
      res
        .status(timeout ? 504 : e.code === "AI_RATE_LIMIT" ? 429 : 503)
        .json({
          message: timeout
            ? "Preview timed out. Please try again."
            : "Preview unavailable. Please try again shortly.",
        });
    }
  }),
);


export default router;
