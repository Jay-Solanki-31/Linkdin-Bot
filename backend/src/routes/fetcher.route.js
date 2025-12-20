import express from "express";
import { startFetch, getFetchedData } from "../controller/fetcher.controller.js";

const router = express.Router();

// Start fetch Job
router.post("/:source", startFetch);

// Get all fetched content
router.get("/fetch", getFetchedData);

export default router;
