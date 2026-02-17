
import { fetcherQueue } from "../queue/fetcher.queue.js";
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

  // Enqueue fetch job; worker will perform DB interactions.
const job = await fetcherQueue.add(
  "FETCH_CONTENT",
  { source },
  { jobId: `fetch-${source}-${Date.now()}` }
);

  return res.json({
    message: `Fetch job added for ${source}`,
    jobId: job.id,
  });
};
export const getFetchedData = async (req, res) => {
  const source = req.query.source;

  if (!source) {
    return res.status(400).json({ success: false, message: "source query param is required to enqueue a fetch job" });
  }

  // Enqueue a fetch job for the requested source instead of polling DB here.
  const job = await fetcherQueue.add("FETCH_CONTENT", { source });

  res.json({ success: true, message: `Fetch job enqueued for ${source}`, jobId: job.id });
};
