// src/routes/ai.routes.js
import express from "express";
import aiService from "../modules/ai/ai.service.js";

const router = express.Router();

// Manual trigger: process one next item
router.post("/generate/one", async (req, res) => {
  try {
    const result = await aiService.generateForNext(); 
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Manual trigger: process a specific contentId
router.post("/generate/:contentId", async (req, res) => {
  try {
    const { contentId } = req.params;
    const result = await aiService.generateForContent(contentId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
