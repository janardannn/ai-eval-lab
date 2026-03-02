import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { requireSessionOwner } from "@/lib/session-auth";

const HEARTBEAT_TTL = 120; // 2 min — 3 missed 30s beats + buffer

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const denied = await requireSessionOwner(id);
  if (denied) return denied;

  await redis.set(`heartbeat:${id}`, Date.now().toString(), "EX", HEARTBEAT_TTL);
  return NextResponse.json({ ok: true });
}
