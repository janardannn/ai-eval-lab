import { NextRequest, NextResponse } from "next/server";

const RATE_LIMITS: Record<string, { limit: number; window: number }> = {
  "/api/auth": { limit: 10, window: 60 },
  "/api/session/start": { limit: 5, window: 60 },
  "/api/ai": { limit: 30, window: 60 },
  "/api/admin": { limit: 60, window: 60 },
  "/api": { limit: 60, window: 60 },
};

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function getRateConfig(pathname: string) {
  for (const [prefix, config] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(prefix)) return config;
  }
  return null;
}

// Using a simple in-memory store for middleware since middleware runs on edge
// and can't import ioredis. This is per-instance but sufficient for single-server.
const store = new Map<string, { count: number; reset: number }>();

function checkLimit(key: string, limit: number, windowSec: number) {
  const now = Math.floor(Date.now() / 1000);
  const entry = store.get(key);

  if (!entry || now >= entry.reset) {
    store.set(key, { count: 1, reset: now + windowSec });
    return { allowed: true, remaining: limit - 1, reset: now + windowSec };
  }

  entry.count++;
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.reset,
  };
}

// Cleanup stale entries periodically
let lastCleanup = Date.now();
function maybeCleanup() {
  if (Date.now() - lastCleanup < 60_000) return;
  lastCleanup = Date.now();
  const now = Math.floor(Date.now() / 1000);
  for (const [key, entry] of store) {
    if (now >= entry.reset) store.delete(key);
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Skip rate limiting for poller (called from containers at high frequency)
  if (pathname.startsWith("/api/poller")) {
    return NextResponse.next();
  }

  const config = getRateConfig(pathname);
  if (!config) return NextResponse.next();

  maybeCleanup();

  const ip = getIp(req);
  const key = `${ip}:${pathname.split("/").slice(0, 4).join("/")}`;
  const result = checkLimit(key, config.limit, config.window);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": config.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": result.reset.toString(),
          "Retry-After": (result.reset - Math.floor(Date.now() / 1000)).toString(),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", config.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.reset.toString());
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
