import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const { id } = await params;

  const [attempts, completions, abandoned, grades, sessions] = await Promise.all([
    prisma.session.count({ where: { assessmentId: id } }),
    prisma.session.count({ where: { assessmentId: id, status: "completed" } }),
    prisma.session.count({ where: { assessmentId: id, status: "abandoned" } }),
    prisma.grade.findMany({
      where: { session: { assessmentId: id } },
      select: { verdict: true, checkpointScores: true },
    }),
    prisma.session.findMany({
      where: { assessmentId: id, status: "completed", startedAt: { not: null }, endedAt: { not: null } },
      select: { startedAt: true, endedAt: true },
    }),
  ]);

  const verdictDistribution: Record<string, number> = {};
  const checkpointTotals: Record<string, { sum: number; count: number }> = {};

  for (const g of grades) {
    verdictDistribution[g.verdict] = (verdictDistribution[g.verdict] || 0) + 1;

    const scores = g.checkpointScores as Record<string, number>;
    for (const [name, score] of Object.entries(scores)) {
      if (!checkpointTotals[name]) checkpointTotals[name] = { sum: 0, count: 0 };
      checkpointTotals[name].sum += score;
      checkpointTotals[name].count++;
    }
  }

  const checkpointAverages: Record<string, number> = {};
  let hardestCheckpoint = "";
  let lowestAvg = Infinity;

  for (const [name, data] of Object.entries(checkpointTotals)) {
    const avg = Math.round((data.sum / data.count) * 10) / 10;
    checkpointAverages[name] = avg;
    if (avg < lowestAvg) {
      lowestAvg = avg;
      hardestCheckpoint = name;
    }
  }

  let avgDuration = 0;
  if (sessions.length > 0) {
    const total = sessions.reduce((sum, s) => {
      return sum + (s.endedAt!.getTime() - s.startedAt!.getTime()) / 1000;
    }, 0);
    avgDuration = Math.round(total / sessions.length);
  }

  const dropoutRate = attempts > 0 ? Math.round((abandoned / attempts) * 100) : 0;

  return NextResponse.json({
    attempts,
    completions,
    abandoned,
    dropoutRate,
    avgDuration,
    verdictDistribution,
    checkpointAverages,
    hardestCheckpoint,
  });
}
