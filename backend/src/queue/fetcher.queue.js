import { Queue } from "bullmq";
import { redisConnection } from "./connection.js";

export const fetcherQueue = new Queue("fetcher-queue", {
  connection: redisConnection.connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 3000 },
    removeOnComplete: true, 
    removeOnFail: {count:10},
  },
});
