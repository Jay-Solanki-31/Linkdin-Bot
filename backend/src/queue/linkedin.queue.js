import { Queue } from "bullmq";
import { redisConnection } from "./connection.js";
import { JOB_TYPES } from "./jobTypes.js";

export const linkedinQueue = new Queue("linkedin-queue", {
  connection: redisConnection.connection,
  defaultJobOptions: {
    removeOnComplete: { age: 3600, count: 20 },
    removeOnFail: { count: 10 },
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30000,
    },
  }
});

export async function enqueueLinkedInPost(postId) {
  if (!postId) {
    throw new Error("postId is required");
  }
  
  return linkedinQueue.add(
    JOB_TYPES.POST_TO_LINKEDIN,
    { postId },
    {
      jobId: `linkedin-post-${postId}`, 
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 30000,
      },
    removeOnComplete: { age: 3600, count: 20 },
    removeOnFail: { count: 10 },
    }
  );
}
