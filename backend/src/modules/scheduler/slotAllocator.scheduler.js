import cron from "node-cron";
import logger from "../../utils/logger.js";
import { allocateWeeklySlots } from "../slotAllocator/slotAllocator.service.js";

export const startSlotAllocatorScheduler = () => {
  logger.info("Slot Allocator Scheduler running (Mondays at 10 AM)");

  cron.schedule("0 10 * * 1", async () => {
    try {
      logger.info("[SlotAllocator] Scheduler triggered");
      await allocateWeeklySlots();
    } catch (err) {
      logger.error("[SlotAllocator] Scheduler error", err);
    }
  });
};
