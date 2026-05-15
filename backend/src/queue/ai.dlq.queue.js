import { Queue } from "bullmq";
import { redisConnection } from "./connection.js";

export const aiDLQ = new Queue("ai-dlq-queue", {
  connection: redisConnection.connection,
});