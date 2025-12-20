import { Queue } from "bullmq";
import { JOB_TYPES } from "./jobTypes.js";
import { redisConnection } from "./connection.js";

export const aiQueue = new Queue("ai-processing-queue", {
  connection: redisConnection.connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 30000 },
    removeOnComplete: { age: 3600, count: 50 },
    removeOnFail: false,
  },
});

export const addAIJob = async (contentId) => {
  return aiQueue.add(JOB_TYPES.GENERATE_POST, { contentId });
};
