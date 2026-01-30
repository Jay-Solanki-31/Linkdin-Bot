
import { fetcherQueue } from "../queue/fetcher.queue.js";
import FetchedContent from "../models/fetchedContent.model.js";
import FetcherService from "../modules/fetchers/fetcher.service.js";

export const startFetch = async (req, res) => {
  const { source } = req.params;

  if (!source) {
    return res.status(400).json({ success: false, message: "Source is required" });
  }

  // Validate source
  const validSources = FetcherService.getAvailableSources();
  if (!validSources.includes(source)) {
    return res.status(400).json({
      success: false,
      message: `Invalid source. Valid sources: ${validSources.join(", ")}`,
    });
  }

  // Use standardized job type FETCH_CONTENT
  const job = await fetcherQueue.add("FETCH_CONTENT", { source });

  return res.json({
    message: `Fetch job added for ${source}`,
    jobId: job.id,
  });
};
export const getFetchedData = async (req, res) => {
  const limit = Number(req.query.limit || 50);

  const data = await FetchedContent.find()
    .sort({ createdAt: -1 })
    .limit(limit);

  res.json({ success: true, count: data.length, data });
};
