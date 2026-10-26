import { enqueueSlotAllocation } from "../queue/slotAllocator.queue.js";
import { requireAuthenticatedMemberUrn } from "../utils/authenticatedAccount.js";

export async function runSlotAllocator(req, res) {
  try {
    const memberUrn = requireAuthenticatedMemberUrn(req, res);
    if (!memberUrn) return;

    const dryRun = req.body?.dryRun === true;
    // Manual runs are safe by default: AI may generate a draft, but the
    // LinkedIn worker is never enqueued unless the caller explicitly opts out.
    const testMode = req.body?.testMode !== false;
    const job = await enqueueSlotAllocation({ memberUrn, dryRun, testMode });

    res.json({
      success: true,
      message: dryRun ? "Slot allocation dry-run queued" : "Slot allocation job queued for the authenticated account",
      jobId: job.id,
      memberUrn,
      dryRun,
      testMode,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
