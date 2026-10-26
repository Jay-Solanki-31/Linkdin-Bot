import "dotenv/config";
import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { createSessionMiddleware } from "./config/session.js";

import cors from "cors";
import cron from "node-cron";
import logger from "./utils/logger.js";
import { connectDB } from "./config/db.js";

// Routes
import fetcherRoute from "./routes/fetcher.route.js";
import aiRoute from "./routes/ai.routes.js";
import linkedinAuthRoutes from "./routes/linkedinAuth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import aiPostsRoutes from "./routes/aiPosts.routes.js";
import publisherRoutes from "./routes/publisher.routes.js";
import slotAllocatorRoutes from "./routes/slotAllocator.routes.js";
import testRoutes from "./routes/test.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import studioRoutes from "./routes/studio.routes.js";


import bullBoard from "./dashboard/bullboard.js";
import dashboardAuth from "./middleware/bullmq.middleware.js";

import { recoverPublishSchedules } from "./services/postScheduling.service.js";

// Scheduler
import { startFetchScheduler } from "./modules/scheduler/fetchScheduler.js";
import { startSlotAllocatorScheduler } from "./modules/scheduler/slotAllocator.scheduler.js";
import { recoverStuckJobs } from "./queue/recovery.js";

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
const allowedOrigins = new Set([
  process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  "http://localhost:5173",
  "https://linkedin-contentbot-frontend.onrender.com",
  "chrome-extension://hiognlmnbdoiicbdigfonpfpoicoijaj"
]);

app.use(
  cors({
    origin: (
      origin,
      callback
    ) => {

      if (
        !origin ||
        allowedOrigins.has(origin)
      ) {
        return callback(
          null,
          true
        );
      }

      callback(
        new Error(
          "Not allowed by CORS"
        )
      );

    },
    credentials: true
  })
);

app.use(createSessionMiddleware());

app.get("/", (req, res) => {
  res.json({ message: "LinkedIn Bot Server Running" });
});

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/ai", aiRoute);
app.use("/api", fetcherRoute);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth/linkedin", linkedinAuthRoutes);
app.use("/api", studioRoutes);
app.use("/api/ai-posts", aiPostsRoutes);
app.use("/api/publisher", publisherRoutes);
app.use("/admin/queues", dashboardAuth, bullBoard.getRouter());
app.use("/api/slot-allocator", slotAllocatorRoutes);
app.use("/api/analytics",analyticsRoutes);
app.use("/test", testRoutes);

if (process.env.ENABLE_BULL_BOARD === "true") {
  app.use(
    "/internal/queues-92xk",
    dashboardAuth,
    bullBoard.getRouter()
  );
}
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    logger.info("DB connected");
    cron.schedule("0 2 * * *", async () => { await recoverStuckJobs(); }, { timezone: "Asia/Kolkata" });

    // 🔥 START WORKERS
    await import("./queue/workers/fetcher.worker.js");
    await import("./queue/workers/ai.worker.js");
    await import("./queue/workers/linkedin.worker.js");
    await import("./queue/workers/slotAllocator.worker.js");

    logger.info("Workers started");
    await recoverPublishSchedules();
    cron.schedule("*/5 * * * *", () => recoverPublishSchedules().catch(error => logger.error(error.message)));

    // 🔥 START SCHEDULERS
    startFetchScheduler();
    startSlotAllocatorScheduler();

    logger.info("Schedulers started");

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

  } catch (err) {
    logger.error("Startup failed:", err);
    process.exit(1);
  }
}

start();