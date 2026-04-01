import client from "prom-client";

// collect default system metrics (CPU, memory, etc.)
client.collectDefaultMetrics();

// custom metrics
export const jobProcessedCounter = new client.Counter({
  name: "jobs_processed_total",
  help: "Total number of jobs processed",
  labelNames: ["type"], 
});

export const jobFailedCounter = new client.Counter({
  name: "jobs_failed_total",
  help: "Total number of failed jobs",
  labelNames: ["type"], 
});

export const jobDurationHistogram = new client.Histogram({
  name: "job_duration_seconds",
  help: "Job processing duration",
  labelNames: ["type"], 
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const queueWaitingGauge = new client.Gauge({
  name: "queue_waiting_jobs",
  help: "Number of waiting jobs in queue",
  labelNames:["queue"]
});

export const queueActiveGauge = new client.Gauge({
  name: "queue_active_jobs",
  help: "Number of active jobs",
  labelNames:["queue"]
});

export const queueDelayedGauge = new client.Gauge({
  name: "queue_delayed_jobs",
  help: "Number of delayed jobs",
  labelNames:["queue"]
});

export const queueFailedGauge = new client.Gauge({
  name: "queue_failed_jobs",
  help: "Number of failed jobs",
  labelNames:["queue"]
});

export const queueCompleteGauge = new client.Gauge({
  name: "queue_complete_jobs",
  help: "Number of complate jobs",
  labelNames:["queue"]
});

// export registry
export const register = client.register;