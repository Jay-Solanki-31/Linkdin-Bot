import express from "express";
import { startFetch, getFetchedData } from "../controller/fetcher.controller.js";

const router = express.Router();
router.post("/start/:source", startFetch);
router.get("/fetch", getFetchedData);

export default router;
