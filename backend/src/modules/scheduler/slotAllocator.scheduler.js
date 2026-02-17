import cron from "node-cron";
import logger from "../../utils/logger.js";
import { enqueueSlotAllocation } from "../../queue/slotAllocator.queue.js";

export const startSlotAllocatorScheduler = () => {
  logger.info("Slot Allocator Scheduler running (Mondays at 10 AM)");

  cron.schedule("0 10 * * 1", async () => {
    try {
      logger.info("[SlotAllocator] Scheduler triggered — enqueueing allocator job");
      await enqueueSlotAllocation();
    } catch (err) {
      logger.error("[SlotAllocator] Scheduler error", err);
    }
  });
};
