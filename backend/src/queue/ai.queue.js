import { Queue } from "bullmq";
import { JOB_TYPES } from "./jobTypes.js";
import { redisConnection } from "./connection.js";

export const aiQueue = new Queue("ai-processing-queue", {
  connection: redisConnection.connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 30000 },
    removeOnComplete: true,
    removeOnFail: {count:10},
  },
});
export const addAIJob = async (postId) => {
  return aiQueue.add(
    JOB_TYPES.GENERATE_POST,
    { postId },
    { jobId: `ai-${postId}` }
  );
};
