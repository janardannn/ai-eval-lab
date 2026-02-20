import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const assessments = await prisma.assessment.findMany({
    include: {
      _count: { select: { sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = await Promise.all(
    assessments.map(async (a) => {
      const grades = await prisma.grade.findMany({
        where: { session: { assessmentId: a.id } },
        select: { checkpointScores: true },
      });

      let avgScore = 0;
      if (grades.length > 0) {
        const total = grades.reduce((sum, g) => {
          const scores = g.checkpointScores as Record<string, number>;
          const values = Object.values(scores);
          return sum + (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0);
        }, 0);
        avgScore = Math.round((total / grades.length) * 10) / 10;
      }

      return {
        id: a.id,
        title: a.title,
        difficulty: a.difficulty,
        environment: a.environment,
        isActive: a.isActive,
        timeLimit: a.timeLimit,
        attempts: a._count.sessions,
        avgScore,
        createdAt: a.createdAt,
      };
    })
  );

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const body = await req.json();

  const assessment = await prisma.assessment.create({
    data: {
      title: body.title,
      difficulty: body.difficulty,
      description: body.description,
      environment: body.environment || "kicad",
      timeLimit: Number(body.timeLimit),
      introConfig: body.introConfig,
      domainConfig: body.domainConfig,
      labConfig: body.labConfig,
    },
  });

  return NextResponse.json(assessment, { status: 201 });
}
