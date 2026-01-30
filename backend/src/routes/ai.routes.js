import express from "express";
import {
  generateAIManually,
} from "../controller/ai.controller.js";

const router = express.Router();

router.post("/generate/:contentId", generateAIManually);
export default router;
