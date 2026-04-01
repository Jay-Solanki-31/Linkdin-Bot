import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

import cors from "cors";
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

import bullBoard from "./dashboard/bullboard.js";
import dashboardAuth from "./middleware/bullmq.middleware.js";
import {register} from "./utils/metrics.js";
import { collectQueueMetrics } from "./utils/queueMetrics.js";


// Scheduler
import { startFetchScheduler } from "./modules/scheduler/fetchScheduler.js";
import { startSlotAllocatorScheduler } from "./modules/scheduler/slotAllocator.scheduler.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(
  session({
    name: "linkedin-bot-session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true, 
    cookie: {
      httpOnly: true,
      secure: true,     
      sameSite: "none", 
    },
  })
);

app.get("/", (req, res) => {
  res.json({ message: "LinkedIn Bot Server Running" });
});


app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});


// collect every 5 seconds
setInterval(() => {
  collectQueueMetrics().catch(console.error);
}, 5000);

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/ai", aiRoute);
app.use("/api", fetcherRoute);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth/linkedin", linkedinAuthRoutes);
app.use("/api/ai-posts", aiPostsRoutes);
app.use("/api/publisher", publisherRoutes);
app.use("/admin/queues", dashboardAuth, bullBoard.getRouter());
app.use("/api/slot-allocator", slotAllocatorRoutes);
app.use("/test", testRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    logger.info("DB connected");

    // 🔥 START WORKERS
    await import("./queue/workers/fetcher.worker.js");
    await import("./queue/workers/ai.worker.js");
    await import("./queue/workers/linkedin.worker.js");
    await import("./queue/workers/slotAllocator.worker.js");

    logger.info("Workers started");

    // 🔥 START SCHEDULERS
    startFetchScheduler();
    startSlotAllocatorScheduler();

    logger.info("Schedulers started");

    app.listen(5000, "0.0.0.0", () => {
      logger.info("Server running on port 5000");
    });

  } catch (err) {
    logger.error("Startup failed:", err);
    process.exit(1);
  }
}

start();