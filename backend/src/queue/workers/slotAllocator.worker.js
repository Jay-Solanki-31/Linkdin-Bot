import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import isoWeek from "dayjs/plugin/isoWeek.js";

import FetchedContent from "../../models/fetchedContent.model.js";
import GeneratedPost from "../../models/generatedPost.model.js";

import { aiQueue } from "../ai.queue.js";
import { JOB_TYPES } from "../jobTypes.js";

import logger from "../../utils/logger.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

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

function generateFutureSlots(nowIST) {
  const slots = SLOT_TIMES.map(({ day, hour }) => {
    let slot = nowIST
      .startOf("isoWeek") // Monday-based week
      .add(day, "day")
      .hour(hour)
      .minute(0)
      .second(0)
      .millisecond(0);

    // move to next week if already passed
    if (slot.isBefore(nowIST)) {
      slot = slot.add(1, "week");
    }

    logger.info(
      `Slot IST: ${slot.format()} | UTC: ${slot.utc().format()}`
    );

    return slot.utc().toDate(); // store in UTC
  });

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

export default new Worker(
  "slot-allocator-queue",
  async () => {
    try {
      const nowIST = dayjs().tz("Asia/Kolkata");

      logger.info(
        `NOW IST: ${nowIST.format()} | NOW UTC: ${nowIST.utc().format()}`
      );

      const weekKey = `${nowIST.year()}-W${String(
        nowIST.isoWeek()
      ).padStart(2, "0")}`;

      logger.info(`[SlotAllocator] Allocating for ${weekKey}`);

      const allSlots = generateFutureSlots(nowIST);

      const existingPosts = await GeneratedPost.find({
        publishAt: {
          $gte: allSlots[0],
          $lte: allSlots[allSlots.length - 1],
        },
      }).select("publishAt articleId");

      const usedSlotTimes = new Set(
        existingPosts.map((p) =>
          new Date(p.publishAt).getTime()
        )
      );

      const freeSlots = allSlots.filter(
        (slot) => !usedSlotTimes.has(slot.getTime())
      );

      logger.info(`Free slots: ${freeSlots.length}`);

      if (!freeSlots.length) return;

      const usedArticleIds = existingPosts.map((p) => p.articleId);

      
      const sources = await FetchedContent.distinct("source", {
        _id: { $nin: usedArticleIds },
      });

      let contents = [];

      for (const source of sources) {
        const items = await FetchedContent.aggregate([
          {
            $match: {
              source,
              _id: { $nin: usedArticleIds },
            },
          },
          { $sample: { size: 1 } },
        ]);

        if (items.length) {
          contents.push(items[0]);
        }
      }

      if (contents.length < freeSlots.length) {
        const remaining = await FetchedContent.aggregate([
          {
            $match: {
              _id: {
                $nin: [
                  ...usedArticleIds,
                  ...contents.map((c) => c._id),
                ],
              },
            },
          },
          { $sample: { size: freeSlots.length - contents.length } },
        ]);

        contents = [...contents, ...remaining];
      } 
      if (!contents.length) {
        logger.info("No new content available");
        return;
      }

      const allocationCount = Math.min(
        freeSlots.length,
        contents.length
      );

      logger.info(`Allocating ${allocationCount} posts`);

      for (let i = 0; i < allocationCount; i++) {
        try {
          const publishAt = freeSlots[i];

          logger.info(
            `Assigning UTC: ${publishAt.toISOString()} → ${contents[i]._id}`
          );

          const post = await GeneratedPost.create({
            articleId: contents[i]._id,
            status: "draft",
            publishAt,
          });

          await aiQueue.add(
            JOB_TYPES.GENERATE_POST,
            { postId: post._id },
            { 
              jobId: `ai-${post._id}`,
              delay: i * 20000, 
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 60000 
              }
            }
          );

        } catch (err) {
          logger.error(
            `Allocation failed for article ${contents[i]._id}: ${err.message}`
          );
        }
      }

      logger.info(`[SlotAllocator] Allocation completed`);
    } catch (error) {
      logger.error(`[SlotAllocator] Error: ${error.message}`);
    }
  },
  {
    connection: redisConnection.connection,
    concurrency: 1,
    lockDuration:60000,
    stalledInterval:300000
  }
);
