import { Queue } from "bullmq";
import {  redisConnection } from "../queue/connection.js";

import {
    queueWaitingGauge,
    queueActiveGauge,
    queueDelayedGauge,
    queueFailedGauge,
    queueCompleteGauge
} from "./metrics.js";

// add all queues here
const queues = [
    new Queue("ai-processing-queue", {
        connection: redisConnection.connection,
    }),
    new Queue("linkedin-queue", {
        connection: redisConnection.connection,
    }),
    new Queue("fetcher-queue", {
        connection: redisConnection.connection,
    }),
];

export async function collectQueueMetrics() {
    for (const queue of queues) {
        const counts = await queue.getJobCounts(
            "waiting",
            "active",
            "delayed",
            "failed",
            "completed"
        );

        queueWaitingGauge.set({ queue: queue.name},counts.waiting);
        queueActiveGauge.set({queue:queue.name},counts.active);
        queueDelayedGauge.set({queue:queue.name},counts.delayed);
        queueFailedGauge.set({queue:queue.name},counts.failed);
        queueCompleteGauge.set({queue:queue.name},counts.completed);
    }
}