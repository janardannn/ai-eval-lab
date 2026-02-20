import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const HEARTBEAT_TTL = 120; // 2 min — 3 missed 30s beats + buffer

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await redis.set(`heartbeat:${id}`, Date.now().toString(), "EX", HEARTBEAT_TTL);
  return NextResponse.json({ ok: true });
}
