import express from "express";
import { postGenerated } from "../controller/publisher.controller.js";
import { publishOneDraftPost } from "../controller/publisher.controller.js";

const router = express.Router();

router.post("/generated/post", postGenerated);

// manual trigger
router.post("/linkedin/publish-one", publishOneDraftPost);

export default router;
