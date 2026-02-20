import { redis } from "./redis";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `rl:${key}:${Math.floor(now / windowSec)}`;

  const count = await redis.incr(windowKey);
  if (count === 1) {
    await redis.expire(windowKey, windowSec);
  }

  const reset = (Math.floor(now / windowSec) + 1) * windowSec;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    reset,
  };
}
