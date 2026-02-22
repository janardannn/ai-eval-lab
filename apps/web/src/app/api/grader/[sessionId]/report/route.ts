import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const grade = await prisma.grade.findUnique({
    where: { sessionId },
  });

  if (!grade) {
    // Check if session was abandoned — no point polling further
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { status: true },
    });
    if (session?.status === "abandoned") {
      return NextResponse.json({ error: "session_abandoned" }, { status: 410 });
    }
    return NextResponse.json({ error: "grade not found" }, { status: 404 });
  }

  return NextResponse.json({
    verdict: grade.verdict,
    checkpointScores: grade.checkpointScores,
    timelineAnalysis: grade.timelineAnalysis,
    qaAnalysis: grade.qaAnalysis,
    overallReport: grade.overallReport,
  });
}
