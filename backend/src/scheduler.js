import dotenv from "dotenv";
import logger from "./utils/logger.js";
import { connectDB } from "./config/db.js";

import { startFetchScheduler } from "./modules/scheduler/fetchScheduler.js";
import { startSlotAllocatorScheduler } from "./modules/scheduler/slotAllocator.scheduler.js";

dotenv.config();

async function startScheduler() {
  try {
    await connectDB();
    logger.info("DB connected — starting schedulers");

    startFetchScheduler();
    startSlotAllocatorScheduler();

    logger.info("Schedulers running");
  } catch (err) {
    logger.error("Scheduler failed:", err);
    process.exit(1);
  }
}

startScheduler();