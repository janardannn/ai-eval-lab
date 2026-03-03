import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionState, getQueuePosition } from "@/lib/redis";
import { requireSessionOwner } from "@/lib/session-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const denied = await requireSessionOwner(id);
  if (denied) return denied;

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
    response.containerReady = true;
  }

  if (state.phase === "lab" || state.phase === "intro" || state.phase === "domain") {
    const session = await prisma.session.findUnique({
      where: { id },
      include: { assessment: { select: { timeLimit: true, description: true, referenceFile: true } } },
    });
    if (session) {
      response.timeLimit = session.assessment.timeLimit;
      response.taskDescription = session.assessment.description;
      response.hasReferenceMaterial = session.assessment.referenceFile !== null;
    }
  }

  return NextResponse.json(response);
}
