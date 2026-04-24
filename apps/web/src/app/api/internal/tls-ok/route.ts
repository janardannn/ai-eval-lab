import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const VNC_BASE = process.env.VNC_DOMAIN || "vnc.localhost";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain) return new NextResponse(null, { status: 400 });

  const pattern = new RegExp(`^s-([a-zA-Z0-9]+)\\.${escapeRegex(VNC_BASE)}$`);
  const match = domain.match(pattern);
  if (!match) return new NextResponse(null, { status: 403 });

  const sessionId = match[1];
  const exists = await redis.exists(`session:${sessionId}`);
  return new NextResponse(null, { status: exists ? 200 : 403 });
}
