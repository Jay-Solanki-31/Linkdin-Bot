import { automationEnabled } from "../../services/automation.service.js";
import { Worker } from "bullmq";
import { redisConnection } from "../connection.js";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import isoWeek from "dayjs/plugin/isoWeek.js";

import FetchedContent from "../../models/fetchedContent.model.js";
import GeneratedPost from "../../models/generatedPost.model.js";
import LinkedInToken from "../../models/linkedinToken.model.js";

import { aiQueue } from "../ai.queue.js";
import { JOB_TYPES } from "../jobTypes.js";
import logger from "../../utils/logger.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

const TIMEZONE = "Asia/Kolkata";

// One post per weekday.
// Monday: 11 AM - 1 PM
// Tuesday-Friday: 9 AM - 11 AM
// Saturday/Sunday: No posts
const SLOT_WINDOWS = [
  { dayOffset: 0, startHour: 11, endHour: 13 },
  { dayOffset: 1, startHour: 9, endHour: 11 },
  { dayOffset: 2, startHour: 9, endHour: 11 },
  { dayOffset: 3, startHour: 9, endHour: 11 },
  { dayOffset: 4, startHour: 9, endHour: 11 },
];

function randomMinute() {
  return Math.floor(Math.random() * 60);
}

function getDayKey(date) {
  return dayjs(date).tz(TIMEZONE).format("YYYY-MM-DD");
}

function getWeekRange(nowIST) {
  const weekStart = nowIST.startOf("isoWeek");
  const nextWeekStart = weekStart.add(1, "week");

  return {
    weekStart,
    nextWeekStart,
  };
}

// Generate only future slots within the current ISO week.
function generateFutureSlots(nowIST) {
  const { weekStart } = getWeekRange(nowIST);
  const slots = [];

  for (const { dayOffset, startHour, endHour } of SLOT_WINDOWS) {
    const hour =
      Math.floor(Math.random() * (endHour - startHour)) +
      startHour;

    const slot = weekStart
      .add(dayOffset, "day")
      .hour(hour)
      .minute(randomMinute())
      .second(0)
      .millisecond(0);

    // Never move expired slots into next week.
    if (!slot.isAfter(nowIST)) {
      logger.info(
        `[SlotAllocator] Skipping past slot: ${slot.format()}`
      );
      continue;
    }

    logger.info(
      `Slot IST: ${slot.format()} | UTC: ${slot.utc().format()}`
    );

    slots.push(slot.utc().toDate());
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

export default new Worker(
  "slot-allocator-queue",

  async (job) => {
    try {
      const {
        memberUrn: requestedMemberUrn,
        dryRun = false,
        testMode = false,
      } = job.data || {};

      if (
        requestedMemberUrn !== undefined &&
        (typeof requestedMemberUrn !== "string" ||
          !requestedMemberUrn.trim())
      ) {
        throw new Error(
          "Slot allocation job has an invalid account owner"
        );
      }

      // Manual allocation: authenticated account only.
      // Scheduled allocation: all connected accounts.
      const accounts = requestedMemberUrn
        ? [{ memberUrn: requestedMemberUrn }]
        : await LinkedInToken.find({
            memberUrn: { $type: "string" },
          }).select("memberUrn");

      if (!accounts.length) {
        logger.info(
          "[SlotAllocator] No LinkedIn accounts connected"
        );
        return;
      }

      const nowIST = dayjs().tz(TIMEZONE);
      const { weekStart, nextWeekStart } =
        getWeekRange(nowIST);

      const weekKey = `${nowIST.isoWeekYear()}-W${String(
        nowIST.isoWeek()
      ).padStart(2, "0")}`;

      logger.info(
        `NOW IST: ${nowIST.format()} | NOW UTC: ${nowIST
          .utc()
          .format()}`
      );

      logger.info(
        `[SlotAllocator] Allocating for ${weekKey}`
      );

      const allSlots = generateFutureSlots(nowIST);

      if (!allSlots.length) {
        logger.info(
          "[SlotAllocator] No future slots in current week"
        );
        return;
      }

      for (const account of accounts) {
        if (!(await automationEnabled(account.memberUrn))) continue;
        const memberUrn = account.memberUrn;

        logger.info(
          `[SlotAllocator] Starting allocation for ${memberUrn}`
        );

        // Fetch every post scheduled in this ISO week
        // for the current LinkedIn account.
        const existingPosts = await GeneratedPost.find({
          linkedinMemberUrn: memberUrn,
          publishAt: {
            $gte: weekStart.utc().toDate(),
            $lt: nextWeekStart.utc().toDate(),
          },
        }).select("publishAt");

        // Check occupied publishing DAYS, not exact minutes.
        const usedDays = new Set(
          existingPosts.map((post) =>
            getDayKey(post.publishAt)
          )
        );

        const freeSlots = allSlots.filter(
          (slot) => !usedDays.has(getDayKey(slot))
        );

        logger.info(
          `[SlotAllocator] Free slots: ${freeSlots.length}`
        );

        if (!freeSlots.length) {
          logger.info(
            `[SlotAllocator] No free slots for ${memberUrn}`
          );
          continue;
        }

        // Exclude articles already used by this account.
        const usedArticleIds = await GeneratedPost.distinct(
          "articleId",
          {
            linkedinMemberUrn: memberUrn,
          }
        );

        logger.info(
          `[SlotAllocator] Previously used articles: ${usedArticleIds.length}`
        );

        // Select content from this account only.
        const sources = await FetchedContent.distinct(
          "source",
          {
            linkedinMemberUrn: memberUrn,
            _id: {
              $nin: usedArticleIds,
            },
          }
        );

        let contents = [];

        // Select one article from each source first.
        for (const source of sources) {
          const items = await FetchedContent.aggregate([
            {
              $match: {
                source,
                linkedinMemberUrn: memberUrn,
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

        // Fill remaining slots from other unused content.
        if (contents.length < freeSlots.length) {
          const remainingCount =
            freeSlots.length - contents.length;

          const excludedIds = [
            ...usedArticleIds,
            ...contents.map(
              (content) => content._id
            ),
          ];

          const remaining = await FetchedContent.aggregate([
            {
              $match: {
                linkedinMemberUrn: memberUrn,
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

          contents = [...contents, ...remaining];
        }

        if (!contents.length) {
          logger.info(
            `[SlotAllocator] No new content for ${memberUrn}`
          );
          continue;
        }

        const allocationCount = Math.min(
          freeSlots.length,
          contents.length
        );

        logger.info(
          `[SlotAllocator] Allocating ${allocationCount} posts for ${memberUrn}`
        );

        // Preview only: no database writes or AI jobs.
        if (dryRun) {
          logger.info(
            `[SlotAllocator] Dry-run: would allocate ${allocationCount} posts for ${memberUrn}`
          );
          continue;
        }

        for (let i = 0; i < allocationCount; i++) {
          const publishAt = freeSlots[i];
          const content = contents[i];

          try {
            logger.info(
              `Assigning UTC: ${publishAt.toISOString()} → ${content._id}`
            );

            const alreadyUsed = await GeneratedPost.exists({
              articleId: content._id,
              linkedinMemberUrn: memberUrn,
            });

            if (alreadyUsed) {
              logger.warn(
                `[SlotAllocator] Article already allocated, skipping: ${content._id}`
              );
              continue;
            }

            // Recheck day occupancy before creating the post.
            const dayStart = dayjs(publishAt)
              .tz(TIMEZONE)
              .startOf("day");

            const dayEnd = dayStart.add(1, "day");

            const existingDayPost = await GeneratedPost.exists({
              linkedinMemberUrn: memberUrn,
              publishAt: {
                $gte: dayStart.utc().toDate(),
                $lt: dayEnd.utc().toDate(),
              },
            });

            if (existingDayPost) {
              logger.warn(
                `[SlotAllocator] Publishing day already occupied: ${getDayKey(publishAt)}`
              );
              continue;
            }

            const post = await GeneratedPost.create({
              articleId: content._id,
              linkedinMemberUrn: memberUrn,
              status: "draft",
              testMode,
              publishAt,
            });

            await aiQueue.add(
              JOB_TYPES.GENERATE_POST,
              {
                postId: post._id,
                linkedinMemberUrn: memberUrn,
                testMode,
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
                `[SlotAllocator] Duplicate allocation skipped: ${content._id}`
              );
              continue;
            }

            logger.error(
              `[SlotAllocator] Allocation failed for article ${content._id}: ${err.message}`
            );
          }
        }

        logger.info(
          `[SlotAllocator] Allocation completed for ${memberUrn}`
        );
      }
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
