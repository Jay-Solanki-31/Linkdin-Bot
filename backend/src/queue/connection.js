// src/queue/connection.js
import { Redis } from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisClient.on("error", (err) => {
  console.error("[REDIS ERROR]", err);
});

export const redisConnection = {
  connection: redisClient,
};
