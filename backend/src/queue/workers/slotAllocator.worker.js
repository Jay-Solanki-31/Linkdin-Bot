import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import { connectDB } from "../../config/db.js";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear.js";

import FetchedContent from "../../models/fetchedContent.model.js";
import GeneratedPost from "../../models/generatedPost.model.js";

import { aiQueue } from "../ai.queue.js";
import { JOB_TYPES } from "../jobTypes.js";

import logger from "../../utils/logger.js";

dayjs.extend(weekOfYear);

await connectDB();

/*
  Tuesday, Wednesday, Thursday
  10:00 and 18:00 IST
*/
const SLOT_TIMES = [
  { day: 2, hour: 10 },
  { day: 2, hour: 18 },
  { day: 3, hour: 10 },
  { day: 3, hour: 18 },
  { day: 4, hour: 10 },
  { day: 4, hour: 18 },
];

function generateFutureSlots(now) {
  const slots = SLOT_TIMES.map(({ day, hour }) => {
    let slot = now
      .startOf("week")
      .add(day, "day")
      .hour(hour)
      .minute(0)
      .second(0)
      .millisecond(0);

    // If already passed → move to next week
    if (slot.isBefore(now)) {
      slot = slot.add(1, "week");
    }

    return slot.toDate();
  });

  //  sort chronologically
  return slots.sort((a, b) => a.getTime() - b.getTime());
}

export default new Worker(
  "slot-allocator-queue",
  async () => {
    try {
      const now = dayjs();
      const weekKey = `${now.year()}-W${String(now.week()).padStart(2, "0")}`;

      logger.info(`[SlotAllocator] Allocating for ${weekKey}`);

      const allSlots = generateFutureSlots(now);

      const existingPosts = await GeneratedPost.find({
        publishAt: { $in: allSlots },
      }).select("publishAt articleId");

      const usedSlotTimes = existingPosts.map(p =>
        new Date(p.publishAt).getTime()
      );

      const freeSlots = allSlots.filter(
        slot => !usedSlotTimes.includes(slot.getTime())
      );

      logger.info(`Free slots: ${freeSlots.length}`);

      if (!freeSlots.length) return;

      const usedArticleIds = existingPosts.map(p => p.articleId);

      const contents = await FetchedContent.find({
        _id: { $nin: usedArticleIds },
      })
        .sort({ createdAt: 1 });

      if (!contents.length) {
        logger.info("No new content available");
        return;
      }

    
      // Only allocate as many as we have content for
      const allocationCount = Math.min(
        freeSlots.length,
        contents.length
      );

      logger.info(`Allocating ${allocationCount} posts`);

      for (let i = 0; i < allocationCount; i++) {
        try {
          const publishAt = freeSlots[i];

          logger.info(
            `Assigning ${publishAt.toISOString()} → ${contents[i]._id}`
          );

          const post = await GeneratedPost.create({
            articleId: contents[i]._id,
            status: "draft",
            publishAt,
          });

          await aiQueue.add(
            JOB_TYPES.GENERATE_POST,
            { postId: post._id },
            { jobId: `ai-${post._id}` }
          );

        } catch (err) {
          logger.error(
            `Allocation failed for article ${contents[i]._id}: ${err.message}`
          );
        }
      }

      logger.info(`[SlotAllocator] Allocation completed`);
    } catch (err) {
      logger.error(`[SlotAllocator] Fatal error: ${err.message}`);
    }
  },
  {
    connection: redisConnection.connection,
    concurrency: 1,
  }
);
