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

function randomMinute() {
  return Math.floor(Math.random() * 60);
}

/**
 * One post per weekday.
 *
 * Monday    -> 11:00-13:00
 * Tuesday   -> 09:00-11:00
 * Wednesday -> 09:00-11:00
 * Thursday  -> 09:00-11:00
 * Friday    -> 09:00-11:00
 *
 * Saturday/Sunday -> no posts
 *
 * Monday starts after the 10:00 IST allocator.
 */
const SLOT_WINDOWS = [
  {
    dayOffset: 0, // Monday
    startHour: 11,
    endHour: 13,
  },

  {
    dayOffset: 1, // Tuesday
    startHour: 9,
    endHour: 11,
  },
  {
    dayOffset: 2, // Wednesday
    startHour: 9,
    endHour: 11,
  },

  {
    dayOffset: 3, // Thursday
    startHour: 9,
    endHour: 11,
  },

  {
    dayOffset: 4, // Friday
    startHour: 9,
    endHour: 11,
  },
];

function generateFutureSlots(nowIST) {
  const weekStart = nowIST.startOf("isoWeek");

  const slots = SLOT_WINDOWS.map(
    ({ dayOffset, startHour, endHour }) => {
      const hour =
        Math.floor(
          Math.random() * (endHour - startHour)
        ) + startHour;

      let slot = weekStart
        .add(dayOffset, "day")
        .hour(hour)
        .minute(randomMinute())
        .second(0)
        .millisecond(0);

      if (slot.isBefore(nowIST)) {
        slot = slot.add(1, "week");
      }

      logger.info(
        `Slot IST: ${slot.format()} | UTC: ${slot
          .utc()
          .format()}`
      );

      return slot.utc().toDate();
    }
  );

  return slots.sort(
    (a, b) => a.getTime() - b.getTime()
  );
}

export default new Worker(
  "slot-allocator-queue",
  async () => {
    try {
      const nowIST = dayjs().tz("Asia/Kolkata");

      logger.info(
        `NOW IST: ${nowIST.format()} | NOW UTC: ${nowIST
          .utc()
          .format()}`
      );

      const weekKey = `${nowIST.year()}-W${String(
        nowIST.isoWeek()
      ).padStart(2, "0")}`;

      logger.info(
        `[SlotAllocator] Allocating for ${weekKey}`
      );

      const allSlots = generateFutureSlots(nowIST);

      const existingPosts = await GeneratedPost.find({
        publishAt: {
          $gte: allSlots[0],
          $lte: allSlots[allSlots.length - 1],
        },
      }).select("publishAt");

      const usedSlotTimes = new Set(
        existingPosts.map(
          (post) =>
            new Date(post.publishAt).getTime()
        )
      );

      const freeSlots = allSlots.filter(
        (slot) =>
          !usedSlotTimes.has(slot.getTime())
      );

      logger.info(
        `[SlotAllocator] Free slots: ${freeSlots.length}`
      );

      if (!freeSlots.length) {
        logger.info(
          "[SlotAllocator] No free slots available"
        );

        return;
      }

      const usedArticleIds =
        await GeneratedPost.distinct("articleId");

      logger.info(
        `[SlotAllocator] Previously used articles: ${usedArticleIds.length}`
      );

      const sources =
        await FetchedContent.distinct("source", {
          _id: {
            $nin: usedArticleIds,
          },
        });

      let contents = [];

      for (const source of sources) {
        const items =
          await FetchedContent.aggregate([
            {
              $match: {
                source,

                _id: {
                  $nin: [
                    ...usedArticleIds,
                    ...contents.map(
                      (content) => content._id
                    ),
                  ],
                },
              },
            },

            {
              $sample: {
                size: 1,
              },
            },
          ]);

        if (items.length) {
          contents.push(items[0]);
        }
      }

      if (contents.length < freeSlots.length) {
        const remainingCount =
          freeSlots.length - contents.length;

        const excludedIds = [
          ...usedArticleIds,
          ...contents.map(
            (content) => content._id
          ),
        ];

        const remaining =
          await FetchedContent.aggregate([
            {
              $match: {
                _id: {
                  $nin: excludedIds,
                },
              },
            },

            {
              $sample: {
                size: remainingCount,
              },
            },
          ]);

        contents = [
          ...contents,
          ...remaining,
        ];
      }
      if (!contents.length) {
        logger.info(
          "[SlotAllocator] No new content available"
        );

        return;
      }

      const allocationCount = Math.min(
        freeSlots.length,
        contents.length
      );

      logger.info(
        `[SlotAllocator] Allocating ${allocationCount} posts`
      );

      for (
        let i = 0;
        i < allocationCount;
        i++
      ) {
        const publishAt = freeSlots[i];
        const content = contents[i];

        try {
          logger.info(
            `Assigning UTC: ${publishAt.toISOString()} → ${content._id}`
          );

          const alreadyUsed =
            await GeneratedPost.exists({
              articleId: content._id,
            });

          if (alreadyUsed) {
            logger.warn(
              `[SlotAllocator] Article already allocated, skipping: ${content._id}`
            );

            continue;
          }

          const post =
            await GeneratedPost.create({
              articleId: content._id,

              status: "draft",

              publishAt,
            });

          await aiQueue.add(
            JOB_TYPES.GENERATE_POST,
            {
              postId: post._id,
            },
            {
              jobId: `ai-${post._id}`,
              delay: i * 20000,
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 60000,
              },
            }
          );

          logger.info(
            `[SlotAllocator] Post allocated successfully: ${post._id}`
          );
        } catch (err) {
          if (err?.code === 11000) {
            logger.warn(
              `[SlotAllocator] Article already allocated, skipping: ${content._id}`
            );

            continue;
          }

          logger.error(
            `[SlotAllocator] Allocation failed for article ${content._id}: ${err.message}`
          );
        }
      }

      logger.info(
        "[SlotAllocator] Allocation completed"
      );
    } catch (error) {
      logger.error(
        `[SlotAllocator] Error: ${error.message}`
      );

      throw error;
    }
  },
  {
    connection: redisConnection.connection,
    concurrency: 1,
    lockDuration: 60000,
    stalledInterval: 300000,
  }
);
