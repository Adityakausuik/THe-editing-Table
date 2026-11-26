import Redis from "ioredis";
import { env } from "./env.js";

/**
 * Resilient Redis Client & Multi-Tier Caching Engine
 * Automatically falls back to in-memory caching if Redis is not provisioned or offline.
 */

// In-Memory Fallback Cache for local dev or when Redis is temporarily unavailable
class InMemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds = 300) {
    // Keep in-memory cache bounded to 1000 keys to avoid memory bloat
    if (this.store.size >= 1000) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  delete(keyPattern) {
    if (keyPattern.includes("*")) {
      const regex = new RegExp(`^${keyPattern.replace(/\*/g, ".*")}$`);
      for (const k of this.store.keys()) {
        if (regex.test(k)) this.store.delete(k);
      }
    } else {
      this.store.delete(keyPattern);
    }
  }

  clear() {
    this.store.clear();
  }
}

const memoryFallback = new InMemoryCache();

let redisClient = null;
let isRedisConnected = false;
let redisWarningLogged = false;

const redisUrl =
  process.env.REDIS_URL ||
  process.env.REDIS_URI ||
  process.env.UPSTASH_REDIS_URL ||
  env.REDIS_URL ||
  "";

if (redisUrl && typeof redisUrl === "string" && redisUrl.trim()) {
  try {
    redisClient = new Redis(redisUrl.trim(), {
      lazyConnect: true,
      enableOfflineQueue: false, // Prevents requests from stalling if Redis is disconnected
      connectTimeout: 2500,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 5) return null; // stop reconnecting after 5 consecutive failures
        return Math.min(times * 300, 2000);
      }
    });

    redisClient.on("connect", () => {
      isRedisConnected = true;
      console.log("[REDIS] Connected to Redis caching instance successfully.");
    });

    redisClient.on("ready", () => {
      isRedisConnected = true;
    });

    redisClient.on("close", () => {
      isRedisConnected = false;
    });

    redisClient.on("error", (err) => {
      isRedisConnected = false;
      if (!redisWarningLogged) {
        console.warn(`[REDIS] Connection error (${err.message}). Using resilient in-memory fallback.`);
        redisWarningLogged = true;
      }
    });

    // Attempt non-blocking background connection
    redisClient.connect().catch((err) => {
      isRedisConnected = false;
      if (!redisWarningLogged) {
        console.warn(`[REDIS] Initial connection failed (${err.message}). Resilient fallback active.`);
        redisWarningLogged = true;
      }
    });
  } catch (err) {
    console.warn(`[REDIS] Initialization failed (${err.message}). Resilient in-memory fallback active.`);
  }
} else {
  // Graceful notification in development / serverless without configured Redis
  // Does not spam logs
}

/**
 * Retrieve cached JSON value from Redis or in-memory fallback.
 */
export async function getCache(key) {
  if (!key) return null;
  try {
    if (isRedisConnected && redisClient) {
      const data = await redisClient.get(key);
      if (data) return JSON.parse(data);
    }
  } catch (err) {
    // Redis read failed, fall back seamlessly
  }
  return memoryFallback.get(key);
}

/**
 * Store JSON value in Redis or in-memory fallback with TTL in seconds.
 */
export async function setCache(key, value, ttlSeconds = 300) {
  if (!key || value === undefined) return;
  const str = JSON.stringify(value);
  try {
    if (isRedisConnected && redisClient) {
      if (ttlSeconds > 0) {
        await redisClient.set(key, str, "EX", ttlSeconds);
      } else {
        await redisClient.set(key, str);
      }
      return;
    }
  } catch (err) {
    // Redis write failed, fall back to memory
  }
  memoryFallback.set(key, value, ttlSeconds);
}

/**
 * Invalidate a specific cache key or wildcard pattern.
 */
export async function deleteCache(patternOrKey) {
  if (!patternOrKey) return;
  try {
    if (isRedisConnected && redisClient) {
      if (patternOrKey.includes("*")) {
        const keys = await redisClient.keys(patternOrKey);
        if (keys && keys.length) {
          await redisClient.del(...keys);
        }
      } else {
        await redisClient.del(patternOrKey);
      }
    }
  } catch (err) {
    // Non-blocking
  }
  memoryFallback.delete(patternOrKey);
}

/**
 * High-level CMS Cache Invalidator
 * When an admin creates, updates, deletes, or reorders CMS items,
 * clears relevant cached responses immediately.
 */
export async function invalidateCmsCache(moduleName) {
  const norm = String(moduleName || "").toLowerCase();
  const keysToClear = [
    `cms:${norm}:*`,
    `cms:${norm}`,
    `cms:public:*`,
    `cms:settings:*`
  ];

  if (norm.includes("hero")) {
    keysToClear.push(
      "cms:hero:*",
      "cms:hero:video:active",
      "cms:hero-slides:*",
      "cms:hero-slides:public",
      "hero-video:*"
    );
  } else if (norm.includes("portfolio")) {
    keysToClear.push("cms:portfolio:*", "cms:portfolio:list", "cms:portfolio:admin");
  } else if (norm.includes("service")) {
    keysToClear.push("cms:services:*", "cms:services:list");
  } else if (norm.includes("collaborat")) {
    keysToClear.push("cms:collaborations:*", "cms:global-reach:*");
  } else if (norm.includes("review")) {
    keysToClear.push("cms:reviews:*", "reviews:public:*");
  }

  await Promise.all(keysToClear.map((k) => deleteCache(k)));
}

/**
 * Health check for Redis and caching layer.
 */
export async function checkRedisHealth() {
  if (!redisUrl) {
    return {
      status: "fallback_memory",
      provider: "none",
      connected: false,
      message: "REDIS_URL not configured. Operating in high-performance in-memory fallback mode.",
      fallbackKeysCount: memoryFallback.store.size
    };
  }

  if (!isRedisConnected || !redisClient) {
    return {
      status: "degraded",
      provider: "redis",
      connected: false,
      message: "Redis configured but temporarily unreachable. Operating in in-memory fallback mode.",
      fallbackKeysCount: memoryFallback.store.size
    };
  }

  try {
    const start = Date.now();
    const pingRes = await redisClient.ping();
    const latencyMs = Date.now() - start;
    return {
      status: "healthy",
      provider: "redis",
      connected: true,
      ping: pingRes,
      latencyMs,
      message: "Redis connection active."
    };
  } catch (err) {
    return {
      status: "degraded",
      provider: "redis",
      connected: false,
      error: err.message,
      message: "Redis ping failed. Fallback active."
    };
  }
}
