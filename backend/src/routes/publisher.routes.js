import express from "express";
import { publishGeneratedPost } from "../controller/publisher.controller.js";

const router = express.Router();

// publish a specific AI-generated post
router.post("/ai-posts/:id/publish", publishGeneratedPost);

export default router;
