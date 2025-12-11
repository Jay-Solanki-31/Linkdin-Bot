// src/routes/fetcher.routes.js
import express from "express";
import { startFetch, getFetchedData } from "../controller/fetcher.controller.js";

const router = express.Router();

// Start fetch: /fetch/github
router.post("/:source", startFetch);

// Get all fetched content
router.get("/fetch", getFetchedData);

export default router;
