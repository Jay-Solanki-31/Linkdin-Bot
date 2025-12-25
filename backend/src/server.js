import express from "express";
import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import logger from "./utils/logger.js";
import connectDB from "./config/db.js";

import fetcherRoute from "./routes/fetcher.route.js";
import aiRoute from "./routes/ai.routes.js";

import { startFetchScheduler } from "./modules/scheduler/fetchScheduler.js";
import { startAIScheduler } from "./modules/scheduler/aiScheduler.js";
import linkedinAuthRoutes from "./routes/linkedinAuth.routes.js";


import bullBoard from "./dashboard/bullboard.js";
import dashboardAuth from "../middleware/bullmq.middleware.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import aiPostsRoutes from "./routes/aiPosts.routes.js";



const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "LinkedIn Bot Server Running" });
});

app.use("/ai", aiRoute);
app.use("/api", fetcherRoute);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth/linkedin", linkedinAuthRoutes);
app.use("/api/ai-posts", aiPostsRoutes);
app.use('/admin/queues', dashboardAuth,bullBoard.getRouter());


const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    logger.info("DB connected — starting workers & scheduler");
    await import("./queue/workers/ai.worker.js");
    await import("./queue/workers/fetcher.worker.js");

    startFetchScheduler(); 
    startAIScheduler(); 

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
