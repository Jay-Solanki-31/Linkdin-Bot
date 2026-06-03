import express from "express";
import { QueueEvents } from "bullmq";
import FetchedContent from "../models/fetchedContent.model.js";
import GeneratedPost from "../models/generatedPost.model.js";
import { fetcherQueue } from "../queue/fetcher.queue.js";
import { aiQueue } from "../queue/ai.queue.js";
import { redisConnection } from "../queue/connection.js";

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


let cachedDashboard = null;
let lastCacheTime = 0;

const CACHE_DURATION = 60 * 1000;

router.get("/", async (req, res) => {
  const now = Date.now();

  if (
    cachedDashboard &&
    now - lastCacheTime < CACHE_DURATION
  ) {
    return res.json(cachedDashboard);
  }

  try {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();

    const day = startOfWeek.getDay();

    const diff =
      day === 0
        ? -6
        : 1 - day;

    startOfWeek.setDate(
      startOfWeek.getDate() + diff
    );

    startOfWeek.setHours(0, 0, 0, 0);

    const trends =
      await FetchedContent.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfWeek,
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

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);

      date.setDate(
        startOfWeek.getDate() + i
      );

      const key =
        date.toISOString().split("T")[0];

      const found = trends.find(
        (item) => item._id === key
      );

      chartData.push({
        name:
          date.toLocaleDateString(
            "en-US",
            {
              weekday: "short",
            }
          ),

        value: found?.count || 0,
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
      fetcherQueue.getJobCounts(),

      aiQueue.getJobCounts(),

      FetchedContent.countDocuments(),

      FetchedContent.countDocuments({
        createdAt: {
          $gte: today,
        },
      }),

      GeneratedPost.countDocuments(),

      FetchedContent.find()
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

    cachedDashboard = responseData;

    lastCacheTime = now;

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
