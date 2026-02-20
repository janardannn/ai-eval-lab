import { NextRequest, NextResponse } from "next/server";
import { getSessionState, getQueuePosition } from "@/lib/redis";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const state = await getSessionState(id);

  if (!state) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const response: Record<string, unknown> = {
    phase: state.phase,
    status: state.status,
  };

  if (state.status === "queued") {
    response.queuePosition = await getQueuePosition(id);
  }

  if (state.containerUrl) {
    response.containerUrl = state.containerUrl;
  }

  return NextResponse.json(response);
}
