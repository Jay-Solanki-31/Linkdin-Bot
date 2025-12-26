import express from "express";
import { testPublish } from "../controller/publisher.controller.js"

const router = express.Router();

router.post("/test", testPublish);

export default router;
