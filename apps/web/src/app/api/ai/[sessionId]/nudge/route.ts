import { NextRequest, NextResponse } from "next/server";
import { getSessionState } from "@/lib/redis";
import { checkForNudge } from "@/lib/nudge";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const state = await getSessionState(sessionId);

  if (!state || state.phase !== "lab") {
    return NextResponse.json({ nudge: false });
  }

  const result = await checkForNudge(sessionId);

  if (!result.shouldNudge || !result.message) {
    return NextResponse.json({ nudge: false });
  }

  return NextResponse.json({
    nudge: true,
    message: result.message,
  });
}
