import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear.js";
import FetchedContent from "../../models/fetchedContent.model.js";
import logger from "../../utils/logger.js";

dayjs.extend(weekOfYear);

const WEEKLY_SLOTS = [
  "TUE-1", "TUE-2",
  "WED-1", "WED-2",
  "THU-1", "THU-2",
];

export async function allocateWeeklySlots() {
  const year = dayjs().year();
  const week = String(dayjs().week()).padStart(2, "0");
  const weekKey = `${year}-W${week}`;

  logger.info(`[SlotAllocator] Allocating slots for ${weekKey}`);

  const usedSlots = await FetchedContent.find({
    slot: { $regex: `^${weekKey}-` },
  }).select("slot");

  const usedSet = new Set(usedSlots.map(s => s.slot));

  const availableSlots = WEEKLY_SLOTS
    .map(s => `${weekKey}-${s}`)
    .filter(s => !usedSet.has(s));

  if (!availableSlots.length) {
    logger.info("[SlotAllocator] No available slots");
    return { allocated: 0 };
  }

  const candidates = await FetchedContent.find({
    status: "fetched",
    slot: null,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  })
    .sort({ createdAt: 1 })
    .limit(availableSlots.length);

  if (!candidates.length) {
    logger.info("[SlotAllocator] No candidates found");
    return { allocated: 0 };
  }

  let allocated = 0;

  for (let i = 0; i < candidates.length; i++) {
    const updated = await FetchedContent.findOneAndUpdate(
      { _id: candidates[i]._id, slot: null },
      {
        $set: {
          status: "selected",
          slot: availableSlots[i],
        },
      },
      { new: true }
    );

    if (updated) allocated++;
  }

  logger.info(`[SlotAllocator] Allocated ${allocated} slots`);
  return { week: weekKey, allocated };
}
