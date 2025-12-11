//  src/controller/ ai.controller.js

import aiService from "../modules/ai/ai.service.js";

export async function generatePosts(req, res) {
  try {
    const result = await aiService.generateAll();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}