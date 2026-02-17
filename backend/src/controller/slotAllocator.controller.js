import { enqueueSlotAllocation } from "../queue/slotAllocator.queue.js";

export async function runSlotAllocator(req, res) {
  try {
    const job = await enqueueSlotAllocation();

    res.json({
      success: true,
      message: "Slot allocation job queued",
      jobId: job.id,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
