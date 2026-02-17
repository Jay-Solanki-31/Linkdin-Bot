import { Queue } from "bullmq";
import { JOB_TYPES } from "./jobTypes.js";
import { redisConnection } from "./connection.js";

export const slotAllocatorQueue = new Queue("slot-allocator-queue", {
  connection: redisConnection.connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: false,
  },
});

export const enqueueSlotAllocation = async () => {
  return slotAllocatorQueue.add(
    JOB_TYPES.ALLOCATE_SLOTS,
    {},
    {
      jobId: `allocate-slots`,
      attempts: 1,
      removeOnComplete: true,
    }
  );
};
