import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireInternalSecret } from "@/lib/session-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const denied = requireInternalSecret(req);
  if (denied) return denied;

  const { sessionId } = await params;
  const body = await req.json();

  const { timestamp, snapshot } = body;
  if (!timestamp || !snapshot) {
    return NextResponse.json({ error: "missing timestamp or snapshot" }, { status: 400 });
  }

  await prisma.snapshot.create({
    data: {
      sessionId,
      timestamp,
      data: snapshot,
    },
  });

  return NextResponse.json({ ok: true });
}
