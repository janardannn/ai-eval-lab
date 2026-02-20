import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

  if (state.phase === "lab" || state.phase === "intro" || state.phase === "domain") {
    const session = await prisma.session.findUnique({
      where: { id },
      include: { assessment: { select: { timeLimit: true, description: true } } },
    });
    if (session) {
      response.timeLimit = session.assessment.timeLimit;
      response.taskDescription = session.assessment.description;
    }
  }

  return NextResponse.json(response);
}
