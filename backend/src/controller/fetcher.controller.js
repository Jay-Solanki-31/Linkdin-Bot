
import { fetcherQueue } from "../queue/fetcher.queue.js";
import FetcherService from "../modules/fetchers/fetcher.service.js";
import FetchedContent from  "../models/fetchedContent.model.js"

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
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      source,
    } = req.query;

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit); 

    const filter = {};

    if (source) {
      filter.source = source;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { source: { $regex: search, $options: "i" } },
      ];
    }

    const total = await FetchedContent.countDocuments(filter);

    const records = await FetchedContent.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return res.json({
      success: true,
      data: records,
      pagination: {
        total,
        page: pageNumber,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch records",
    });
  }
};
