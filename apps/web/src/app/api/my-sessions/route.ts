import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id },
    include: {
      assessment: { select: { title: true, difficulty: true, environment: true, timeLimit: true } },
      grade: { select: { verdict: true, checkpointScores: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    sessions.map((s) => ({
      id: s.id,
      assessment: s.assessment.title,
      difficulty: s.assessment.difficulty,
      environment: s.assessment.environment,
      timeLimit: s.assessment.timeLimit,
      status: s.status,
      verdict: s.grade?.verdict ?? null,
      checkpointScores: s.grade?.checkpointScores ?? null,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      createdAt: s.createdAt,
    }))
  );
}
