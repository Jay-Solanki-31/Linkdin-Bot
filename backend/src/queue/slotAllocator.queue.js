import { Queue } from "bullmq";
import { JOB_TYPES } from "./jobTypes.js";
import { redisConnection } from "./connection.js";

export const slotAllocatorQueue = new Queue("slot-allocator-queue", {
  connection: redisConnection.connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 3600, count: 20 },
    removeOnFail: { count: 10 },
  },
});

export const enqueueSlotAllocation = async ({ memberUrn, dryRun = false, testMode = false } = {}) => {
  if (memberUrn && (typeof memberUrn !== "string" || !memberUrn.trim())) {
    throw new Error("memberUrn must be a non-empty string");
  }
  const dateKey = new Date().toISOString().slice(0, 10);
  const ownerKey = memberUrn ? encodeURIComponent(memberUrn) : "all-accounts";
  return slotAllocatorQueue.add(
    JOB_TYPES.ALLOCATE_SLOTS,
    { ...(memberUrn ? { memberUrn } : {}), dryRun: Boolean(dryRun), testMode: Boolean(testMode) },
    {
      jobId: `allocate-slots-${ownerKey}-${dateKey}`,
      attempts: 1,
      removeOnComplete: { age: 3600, count: 20 },
      removeOnFail: { count: 10 },
    }
  );
};