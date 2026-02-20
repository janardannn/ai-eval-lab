import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const [
    totalAssessments,
    totalSessions,
    totalCompleted,
    totalInProgress,
    totalAbandoned,
    grades,
    sessions,
  ] = await Promise.all([
    prisma.assessment.count({ where: { isActive: true } }),
    prisma.session.count(),
    prisma.session.count({ where: { status: "completed" } }),
    prisma.session.count({ where: { status: "active" } }),
    prisma.session.count({ where: { status: "abandoned" } }),
    prisma.grade.findMany({ select: { verdict: true } }),
    prisma.session.findMany({
      where: { status: "completed", startedAt: { not: null }, endedAt: { not: null } },
      select: { startedAt: true, endedAt: true },
    }),
  ]);

  const verdictDistribution: Record<string, number> = {};
  for (const g of grades) {
    verdictDistribution[g.verdict] = (verdictDistribution[g.verdict] || 0) + 1;
  }

  let avgSessionDuration = 0;
  if (sessions.length > 0) {
    const totalDuration = sessions.reduce((sum, s) => {
      if (s.startedAt && s.endedAt) {
        return sum + (s.endedAt.getTime() - s.startedAt.getTime()) / 1000;
      }
      return sum;
    }, 0);
    avgSessionDuration = Math.round(totalDuration / sessions.length);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSessions = await prisma.session.findMany({
    where: { status: "completed", endedAt: { gte: thirtyDaysAgo } },
    select: { endedAt: true },
  });

  const completionsPerDay: Record<string, number> = {};
  for (const s of recentSessions) {
    if (s.endedAt) {
      const day = s.endedAt.toISOString().split("T")[0];
      completionsPerDay[day] = (completionsPerDay[day] || 0) + 1;
    }
  }

  const topAssessments = await prisma.session.groupBy({
    by: ["assessmentId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  const topAssessmentDetails = await Promise.all(
    topAssessments.map(async (a) => {
      const assessment = await prisma.assessment.findUnique({
        where: { id: a.assessmentId },
        select: { title: true },
      });
      return { id: a.assessmentId, title: assessment?.title || "Unknown", attempts: a._count.id };
    })
  );

  return NextResponse.json({
    totalAssessments,
    totalSessions,
    totalCompleted,
    totalInProgress,
    totalAbandoned,
    avgSessionDuration,
    verdictDistribution,
    completionsPerDay: Object.entries(completionsPerDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    topAssessmentsByAttempts: topAssessmentDetails,
  });
}
