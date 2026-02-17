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
  10:00 and 18:00
*/
const SLOT_TIMES = [
  { day: 2, hour: 10 },
  { day: 2, hour: 18 },
  { day: 3, hour: 10 },
  { day: 3, hour: 18 },
  { day: 4, hour: 10 },
  { day: 4, hour: 18 },
];

export default new Worker(
  "slot-allocator-queue",
  async () => {
    const now = dayjs();
    const year = now.year();
    const week = String(now.week()).padStart(2, "0");
    const weekKey = `${year}-W${week}`;

    logger.info(`[SlotAllocator] Allocating for ${weekKey}`);

    // already allocated articles THIS WEEK only
    const usedArticleIds = await GeneratedPost.distinct("articleId", {
      publishAt: {
        $gte: now.startOf("week").toDate(),
        $lte: now.endOf("week").toDate(),
      },
    });

    const contents = await FetchedContent.find({
      _id: { $nin: usedArticleIds },
    }).limit(SLOT_TIMES.length);

    let allocated = 0;

    for (let i = 0; i < contents.length; i++) {
      const slot = SLOT_TIMES[i];

      let publishAt = dayjs()
        .startOf("week")
        .add(slot.day, "day")
        .hour(slot.hour)
        .minute(0)
        .second(0);

      if (publishAt.isBefore(dayjs())) {
        publishAt = publishAt.add(1, "week");
      }

      publishAt = publishAt.toDate();

      const result = await GeneratedPost.updateOne(
        { articleId: contents[i]._id },
        {
          $setOnInsert: {
            articleId: contents[i]._id,
            status: "draft",
            publishAt,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount === 1) {
        const post = await GeneratedPost.findOne({
          articleId: contents[i]._id,
        });

        await aiQueue.add(
          JOB_TYPES.GENERATE_POST,
          { postId: post._id },
          { jobId: `ai-${post._id}` },
        );

        allocated++;
      }
    }

    logger.info(`[SlotAllocator] Allocated ${allocated} posts`);
  },
  {
    connection: redisConnection.connection,
    concurrency: 1,
  },
);
