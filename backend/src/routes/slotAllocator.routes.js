import express from "express";
import { runSlotAllocator } from "../controller/slotAllocator.controller.js";

const router = express.Router();

router.post("/run", runSlotAllocator);

export default router;
