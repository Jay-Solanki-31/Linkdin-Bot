import FetchedContent from "../models/fetchedContent.model.js";
import { addAIJob } from "../queue/ai.queue.js";

export const generateAIManually = async (req, res) => {
  const { contentId } = req.params;

  const doc = await FetchedContent.findOneAndUpdate(
    {
      _id: contentId,
      status: "selected",
      aiGenerated: false,
      isQueued: { $ne: true },
      processing: { $ne: true },
    },
    {
      $set: {
        isQueued: true, // enqueue marker ONLY
      },
    },
    { new: true }
  );

  if (!doc) {
    return res.status(409).json({
      success: false,
      error: "Content already queued or processing",
    });
  }

  await addAIJob(contentId);

  return res.json({
    success: true,
    queued: true,
    contentId,
  });
};
