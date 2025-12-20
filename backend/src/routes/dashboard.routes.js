import express from "express";
import { QueueEvents } from "bullmq";
import FetchedContent from "../models/fetchedContent.model.js";
import { fetcherQueue } from "../queue/fetcher.queue.js";
import { aiQueue } from "../queue/ai.queue.js";
import { redisConnection } from "../queue/connection.js";

const router = express.Router();

/*  Queue Events  */

const fetcherEvents = new QueueEvents("fetcher-queue", {
  connection: redisConnection.connection,
});

let NEXT_RUN = null;

fetcherEvents.on("completed", () => {
  NEXT_RUN = new Date(Date.now() + 5 * 60 * 1000);
});

/*  Route  */

router.get("/", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      fetcherStats,
      aiStats,
      totalFetched,
      todayFetched,
      aiGeneratedCount,
      recent,
      redisStatus,
    ] = await Promise.all([
      fetcherQueue.getJobCounts(),
      aiQueue.getJobCounts(),
      FetchedContent.countDocuments(),
      FetchedContent.countDocuments({ createdAt: { $gte: today } }),
      FetchedContent.countDocuments({ aiGenerated: true }),
      FetchedContent.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title source createdAt aiGenerated"),
      redisConnection.connection.ping().then(
        () => true,
        () => false
      ),
    ]);

    res.json({
      stats: {
        totalFetched,
        todayFetched,
        aiGeneratedCount,
      },

      queue: [
        {
          name: "Fetcher Queue",
          pending: fetcherStats.waiting + fetcherStats.delayed,
          active: fetcherStats.active,
          completed: fetcherStats.completed,
          failed: fetcherStats.failed,
          status: fetcherStats.active > 0 ? "running" : "idle",
        },
        {
          name: "AI Processing Queue",
          pending: aiStats.waiting + aiStats.delayed,
          active: aiStats.active,
          completed: aiStats.completed,
          failed: aiStats.failed,
          status: aiStats.active > 0 ? "running" : "idle",
        },
      ],

      system: {
        redisConnected: redisStatus,
        lastRun: new Date().toISOString(),
        nextRun: NEXT_RUN,
      },

      recentActivity: recent,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({
      message: "Dashboard error",
      error: err.message,
    });
  }
});

export default router;
