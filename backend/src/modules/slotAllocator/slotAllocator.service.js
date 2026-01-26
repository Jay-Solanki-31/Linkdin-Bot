import dayjs from "dayjs";
import FetchedContent from "../../models/fetchedContent.model.js";
import logger from "../../utils/logger.js";

const WEEKLY_SLOTS = [
  "TUE-1", "TUE-2",
  "WED-1", "WED-2",
  "THU-1", "THU-2",
];

export async function allocateWeeklySlots() {
  const weekKey = dayjs().format("YYYY-[W]WW");

  logger.info(`[SlotAllocator] Allocating slots for ${weekKey}`);

  const candidates = await FetchedContent.find({
    status: "fetched",
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .limit(12);
    
  if (!candidates.length) {
    logger.info("[SlotAllocator] No candidates found");
    return { allocated: 0 };
  }

  const selected = candidates.slice(0, WEEKLY_SLOTS.length);

  for (let i = 0; i < selected.length; i++) {
    selected[i].status = "selected";
    selected[i].slot = `${weekKey}-${WEEKLY_SLOTS[i]}`;
    await selected[i].save();
  }

  logger.info(`[SlotAllocator] Allocated ${selected.length} slots`);

  return {
    week: weekKey,
    allocated: selected.length,
  };
}
