import express from "express";
import { generateAIManually } from "../controller/ai.controller.js";

const router = express.Router();

// must be postId (not contentId)
router.post("/generate/:postId", generateAIManually);

export default router;
