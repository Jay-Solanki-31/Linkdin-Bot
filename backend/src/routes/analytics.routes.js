import express from "express";

import {
  syncAnalytics,
  getAnalyticsHistory,
  getAnalyticsPosts
} from "../controller/analytics.controller.js";
// import extensionAuth from "../middleware/extensionAuth.middleware.js";

const router = express.Router();

router.post("/sync", syncAnalytics);

router.get("/posts", getAnalyticsPosts);

router.get(
  "/history/:urn",
  getAnalyticsHistory
);

export default router;