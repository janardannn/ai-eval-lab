import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { gradeSession } from "@/lib/grader";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: { assessment: true },
  });

  if (!session) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [snapshots, qaPairs] = await Promise.all([
    prisma.snapshot.findMany({ where: { sessionId: id }, orderBy: { timestamp: "asc" } }),
    prisma.qAPair.findMany({ where: { sessionId: id }, orderBy: { timestamp: "asc" } }),
  ]);

  const labConfig = session.assessment.labConfig as unknown as {
    rubric: { checkpoints: { name: string; description: string; weight: number }[] };
  };

  const result = await gradeSession(
    snapshots.map((s) => ({
      timestamp: s.timestamp,
      data: s.data as { footprints: unknown[]; tracks: unknown[]; zones: unknown[] },
    })),
    qaPairs.map((qa) => ({ phase: qa.phase, question: qa.question, answer: qa.answer })),
    labConfig.rubric
  );

  await prisma.grade.upsert({
    where: { sessionId: id },
    create: {
      sessionId: id,
      verdict: result.verdict,
      checkpointScores: result.checkpointScores,
      timelineAnalysis: result.timelineAnalysis,
      qaAnalysis: result.qaAnalysis,
      overallReport: result.overallReport,
    },
    update: {
      verdict: result.verdict,
      checkpointScores: result.checkpointScores,
      timelineAnalysis: result.timelineAnalysis,
      qaAnalysis: result.qaAnalysis,
      overallReport: result.overallReport,
    },
  });

  return NextResponse.json({ ok: true, verdict: result.verdict });
}
