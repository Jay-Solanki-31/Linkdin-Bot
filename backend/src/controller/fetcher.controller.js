// src/controller/fetcher.controller.js

import { fetcherQueue } from "../queue/fetcher.queue.js";
import FetchedContent from "../models/fetchedContent.model.js";

export const startFetch = async (req, res) => {
  const { source } = req.params;

  if (!source) {
    return res.status(400).json({ success: false, message: "Source is required" });
  }

  const job = await fetcherQueue.add("fetch-job", { source });

  return res.json({
    message: `Fetch job added for ${source}`,
    jobId: job.id,
  });
};

export const getFetchedData = async (req, res) => {
  const data = await FetchedContent.find().sort({ createdAt: -1 });

  res.json({
    success: true,
    count: data.length,
    data,
  });
};
