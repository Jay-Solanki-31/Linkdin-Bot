import cron from "node-cron";
import dayjs from "dayjs";
import GeneratedPost from "../../models/generatedPost.model.js";
import { enqueueLinkedInPost } from "../../queue/linkedin.queue.js";
import logger from "../../utils/logger.js";

/*
Slot mapping
TUE-1 → 10:00
TUE-2 → 17:00
WED-1 → 10:00
WED-2 → 17:00
THU-1 → 10:00
THU-2 → 17:00
*/

async function runSlot(slotNumber) {
  const weekday = dayjs().format("ddd").toUpperCase(); // TUE/WED/THU

  const regex = new RegExp(`-${weekday}-${slotNumber}$`);

  const post = await GeneratedPost.findOneAndUpdate(
    {
      status: "draft",
      processing: { $ne: true },
      slot: { $regex: regex },
    },
    {
      $set: {
        status: "queued",
        processing: true,
        processingAt: new Date(),
      },
    },
    { sort: { createdAt: 1 }, new: true }
  );

  if (!post) {
    logger.info(`[LinkedIn Scheduler] No post for ${weekday}-${slotNumber}`);
    return;
  }

  await enqueueLinkedInPost(post._id.toString());

  logger.info(
    `[LinkedIn Scheduler] Queued ${weekday}-${slotNumber}`,
    post._id
  );
}

export const startLinkedInPostScheduler = () => {
  logger.info("LinkedIn scheduler started (slot-based)");

  // Slot 1 → 10 AM
  cron.schedule(
    "0 10 * * 2-4",
    () => runSlot(1),
    { timezone: "Asia/Kolkata" }
  );

  // Slot 2 → 5 PM
  cron.schedule(
    "0 17 * * 2-4",
    () => runSlot(2),
    { timezone: "Asia/Kolkata" }
  );
};
