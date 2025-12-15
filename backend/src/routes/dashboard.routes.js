import express from "express";
import { QueueEvents } from "bullmq";
import FetchedContent from "../models/fetchedContent.model.js";
import { fetcherQueue } from "../queue/fetcher.queue.js";
import { redisConnection } from "../queue/connection.js";

const router = express.Router();

const fetcherEvents = new QueueEvents("fetcherQueue", {
  connection: redisConnection.connection,
});

let NEXT_RUN = null;

fetcherEvents.on("completed", () => {
  NEXT_RUN = new Date(Date.now() + 5 * 60 * 1000);
});

fetcherEvents.on("waiting", () => {
  NEXT_RUN = new Date(Date.now() + 1 * 60 * 1000);
});

router.get("/", async (req, res) => {
  try {
    const queueStats = await fetcherQueue.getJobCounts();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalFetched,
      todayFetched,
      aiGeneratedCount,
      recent,
      redisStatus,
    ] = await Promise.all([
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
      queue: {
        ...queueStats,
        running: queueStats.active > 0,
      },
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
