import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSessionState } from "@/lib/redis";
import { gradeSession } from "@/lib/grader";
import { sendCompletionEmail } from "@/lib/email";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      assessment: true,
      user: { select: { email: true, name: true } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const snapshots = await prisma.snapshot.findMany({
    where: { sessionId },
    orderBy: { timestamp: "asc" },
  });

  const qaPairs = await prisma.qAPair.findMany({
    where: { sessionId },
    orderBy: { timestamp: "asc" },
  });

  const labConfig = session.assessment.labConfig as unknown as {
    rubric: { checkpoints: { name: string; description: string; weight: number }[] };
  };
  const rubric = labConfig.rubric;

  const result = await gradeSession(
    snapshots.map((s) => ({
      timestamp: s.timestamp,
      data: s.data as { footprints: unknown[]; tracks: unknown[]; zones: unknown[] },
    })),
    qaPairs.map((qa) => ({
      phase: qa.phase,
      question: qa.question,
      answer: qa.answer,
    })),
    rubric
  );

  await prisma.grade.create({
    data: {
      sessionId,
      verdict: result.verdict,
      checkpointScores: result.checkpointScores,
      timelineAnalysis: result.timelineAnalysis,
      qaAnalysis: result.qaAnalysis,
      overallReport: result.overallReport,
    },
  });

  await setSessionState(sessionId, { phase: "graded" });

  sendCompletionEmail(
    session.user.email!,
    session.user.name,
    session.assessment.title,
    sessionId,
    result.verdict
  ).catch(() => {});

  return NextResponse.json({ status: "graded", verdict: result.verdict });
}
