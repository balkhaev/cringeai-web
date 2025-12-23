import { Redis } from "ioredis";
import { redis as redisConfig } from "../config";

export const redis = new Redis(redisConfig.url, {
  maxRetriesPerRequest: null,
});

redis.on("error", (error: Error) => {
  console.error("Redis connection error:", error);
});

redis.on("connect", () => {
  console.log("Redis connected");
});
