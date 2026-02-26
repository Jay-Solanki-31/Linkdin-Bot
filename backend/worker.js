import dotenv from "dotenv";
import logger from "./src/utils/logger.js";
import { connectDB } from "./src/config/db.js";

dotenv.config();

async function startWorker() {
  try {
    await connectDB();
    logger.info("DB connected — starting workers");

    await import("./src/queue/workers/fetcher.worker.js");
    await import("./src/queue/workers/ai.worker.js");
    await import("./src/queue/workers/linkedin.worker.js");
    await import("./src/queue/workers/slotAllocator.worker.js");

    logger.info("Workers started");
  } catch (err) {
    logger.error("Worker startup failed:", err);
    process.exit(1);
  }
}

startWorker();