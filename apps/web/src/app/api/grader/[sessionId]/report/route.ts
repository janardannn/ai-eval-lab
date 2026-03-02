import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionOwner } from "@/lib/session-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const denied = await requireSessionOwner(sessionId);
  if (denied) return denied;

  const grade = await prisma.grade.findUnique({
    where: { sessionId },
  });

  if (!grade) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { status: true },
    });
    if (!session) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }
    if (session.status === "abandoned") {
      return NextResponse.json({ error: "session_abandoned" }, { status: 410 });
    }
    return NextResponse.json({ status: "grading" }, { status: 202 });
  }

  return NextResponse.json({
    verdict: grade.verdict,
    checkpointScores: grade.checkpointScores,
    timelineAnalysis: grade.timelineAnalysis,
    qaAnalysis: grade.qaAnalysis,
    overallReport: grade.overallReport,
  });
}
