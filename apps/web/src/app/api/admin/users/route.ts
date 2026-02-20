import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const users = await prisma.user.findMany({
    include: {
      _count: { select: { sessions: true } },
      sessions: {
        where: { grade: { isNot: null } },
        include: { grade: { select: { checkpointScores: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = users.map((u) => {
    let avgScore = 0;
    const gradedSessions = u.sessions.filter((s) => s.grade);
    if (gradedSessions.length > 0) {
      const total = gradedSessions.reduce((sum, s) => {
        const scores = s.grade!.checkpointScores as Record<string, number>;
        const values = Object.values(scores);
        return sum + (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0);
      }, 0);
      avgScore = Math.round((total / gradedSessions.length) * 10) / 10;
    }

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      isAdmin: u.isAdmin,
      sessionCount: u._count.sessions,
      avgScore,
      createdAt: u.createdAt,
    };
  });

  return NextResponse.json(result);
}
