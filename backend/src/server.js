import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
dotenv.config();

import cors from "cors";
import logger from "./utils/logger.js";
import { connectDB } from "./config/db.js";

import fetcherRoute from "./routes/fetcher.route.js";
import aiRoute from "./routes/ai.routes.js";

import { startFetchScheduler } from "./modules/scheduler/fetchScheduler.js";
import { startAIScheduler } from "./modules/scheduler/aiScheduler.js";
import { startLinkedInPostScheduler } from "./modules/scheduler/linkedinPostScheduler.js";
import { startSlotAllocatorScheduler } from "./modules/scheduler/slotAllocator.scheduler.js";

import linkedinAuthRoutes from "./routes/linkedinAuth.routes.js";

import bullBoard from "./dashboard/bullboard.js";
import dashboardAuth from "./middleware/bullmq.middleware.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import aiPostsRoutes from "./routes/aiPosts.routes.js";
import publisherRoutes from "./routes/publisher.routes.js";
import slotAllocatorRoutes from "./routes/slotAllocator.routes.js";


const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(
  session({
    secret: "process.env.SESSION_SECRET",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 10,
    },
  }),
);

app.get("/", (req, res) => {
  res.json({ message: "LinkedIn Bot Server Running" });
});

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/ai", aiRoute);
app.use("/api", fetcherRoute);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth/linkedin", linkedinAuthRoutes);
app.use("/api/ai-posts", aiPostsRoutes);
app.use("/api/publisher", publisherRoutes);
app.use("/admin/queues", dashboardAuth, bullBoard.getRouter());
app.use("/api/slot-allocator", slotAllocatorRoutes);


const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    logger.info("DB connected — starting workers & scheduler");

    await import("./queue/workers/fetcher.worker.js");
    await import("./queue/workers/ai.worker.js");
    await import("./queue/workers/linkedin.worker.js");

    startFetchScheduler();
    startSlotAllocatorScheduler();
    startAIScheduler();
    startLinkedInPostScheduler();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
