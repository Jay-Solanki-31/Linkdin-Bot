import { Redis } from "ioredis";
import dotenv from "dotenv";
dotenv.config();

let redisClient;

const redisOptions = {
  maxRetriesPerRequest: null, 
  enableReadyCheck: false,
  keepAlive: 30000, 
};

if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, redisOptions);
} else {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    ...redisOptions
  });
}

redisClient.on("error", (err) => {
  console.error("[REDIS ERROR]", err);
});

export const redisConnection = {
  connection: redisClient,
};
