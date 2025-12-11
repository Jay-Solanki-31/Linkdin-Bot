// src/queue/fetcher.queue.js
import { Queue } from "bullmq";
import { redisConnection } from "./connection.js";

export const fetcherQueue = new Queue("fetcher-queue", {
  connection: redisConnection.connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 3000 },
    removeOnComplete: {age:3600 ,count:50}, 
    removeOnFail: false,
  },
});
