import { Router } from "express";
import Article from "../modules/storage/models/Article.js";

const router = Router();

router.get("/db-test", async (req, res) => {
  try {
    const sample = {
      source: "devto",
      title: "Sample Test Article",
      url: "https://test.com/" + Date.now(),
      content: "This is a test article to check MongoDB connection.",
      author: "Bot Tester",
      tags: ["test", "mongodb"],
      publishedAt: new Date(),
    };

    const created = await Article.create(sample);

    const latest = await Article.find().sort({ createdAt: -1 }).limit(3);

    res.json({
      message: "DB test route working",
      created,
      latest,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "DB Test Failed", error: err.message });
  }
});

export default router;
