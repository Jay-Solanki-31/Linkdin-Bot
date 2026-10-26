import express from "express";
import { QueueEvents } from "bullmq";
import FetchedContent from "../models/fetchedContent.model.js";
import GeneratedPost from "../models/generatedPost.model.js";
import { fetcherQueue } from "../queue/fetcher.queue.js";
import { aiQueue } from "../queue/ai.queue.js";
import { redisConnection } from "../queue/connection.js";
import { requireAuthenticatedMemberUrn } from "../utils/authenticatedAccount.js";

const router = express.Router();

router.get("/ping", (req, res) => {
  res.send("pong");
});

const fetcherEvents = new QueueEvents(
  "fetcher-queue",
  {
    connection: redisConnection.connection,
  }
);

let NEXT_RUN = null;

fetcherEvents.on("completed", () => {
  NEXT_RUN = new Date(
    Date.now() + 5 * 60 * 1000
  );
});


const dashboardCache = new Map();

const CACHE_DURATION = 60 * 1000;

async function getAccountQueueCounts(queue, linkedinMemberUrn) {
  const jobs = await queue.getJobs(
    ["waiting", "active", "delayed", "completed", "failed"],
    0,
    -1,
  );
  const counts = { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0 };
  for (const job of jobs) {
    if (job.data?.linkedinMemberUrn !== linkedinMemberUrn) continue;
    const state = await job.getState();
    if (counts[state] !== undefined) counts[state] += 1;
  }
  return counts;
}

router.get("/", async (req, res) => {
  const linkedinMemberUrn = requireAuthenticatedMemberUrn(req, res);
  if (!linkedinMemberUrn) return;
  const now = Date.now();
  const cached = dashboardCache.get(linkedinMemberUrn);

  if (
    cached &&
    now - cached.time < CACHE_DURATION
  ) {
    return res.json(cached.data);
  }

  try {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

      const startDate = new Date();

      startDate.setDate(
        startDate.getDate() - 29
      );

      startDate.setHours(
        0,
        0,
        0,
        0
      );

    const trends =
      await FetchedContent.aggregate([
        {
          $match: {
            linkedinMemberUrn,
            createdAt: {
              $gte: startDate,
            },
          },
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },

            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]);

    const chartData = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);

      date.setDate(
        date.getDate() + i
      );

          const key =
      date.toLocaleDateString(
        "en-CA"
      );

      const found =
        trends.find(
          item => item._id === key
        );

      chartData.push({
        name: date.toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric"
          }
        ),
        value: found?.count || 0
      });

    }


    const [
      fetcherStats,
      aiStats,
      totalFetched,
      todayFetched,
      aiGeneratedCount,
      recent,
    ] = await Promise.all([
      getAccountQueueCounts(fetcherQueue, linkedinMemberUrn),

      getAccountQueueCounts(aiQueue, linkedinMemberUrn),

      FetchedContent.countDocuments({ linkedinMemberUrn }),

      FetchedContent.countDocuments({ linkedinMemberUrn, createdAt: {
          $gte: today,
        },
      }),

      GeneratedPost.countDocuments({ linkedinMemberUrn }),

      FetchedContent.find({ linkedinMemberUrn })
        .sort({
          createdAt: -1,
        })
        .limit(5)
        .select(
          "title source createdAt"
        ),
    ]);

    const responseData = {
      stats: {
        totalFetched,
        todayFetched,
        aiGeneratedCount,
      },

      chartData,

      queue: {
        running:
          fetcherStats.active > 0 ||
          aiStats.active > 0,

        fetcher: {
          waiting:
            fetcherStats.waiting,

          active:
            fetcherStats.active,

          completed:
            fetcherStats.completed,

          failed:
            fetcherStats.failed,
        },

        ai: {
          waiting:
            aiStats.waiting,

          active: aiStats.active,

          completed:
            aiStats.completed,

          failed: aiStats.failed,
        },
      },

      system: {
        redisConnected: true,

        lastRun:
          new Date().toISOString(),

        nextRun: NEXT_RUN,
      },

      recentActivity: recent,
    };

    dashboardCache.set(linkedinMemberUrn, { data: responseData, time: now });

    return res.json(responseData);
  } catch (err) {
    console.error(
      "Dashboard error:",
      err
    );

    return res.status(500).json({
      message: "Dashboard error",
      error: err.message,
    });
  }
});

export default router;
