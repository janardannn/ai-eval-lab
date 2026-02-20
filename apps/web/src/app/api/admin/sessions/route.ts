import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const { searchParams } = new URL(req.url);
  const assessmentId = searchParams.get("assessmentId");
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");
  const verdict = searchParams.get("verdict");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (assessmentId) where.assessmentId = assessmentId;
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (verdict) where.grade = { verdict };
  if (from || to) {
    where.createdAt = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        assessment: { select: { title: true, difficulty: true } },
        grade: { select: { verdict: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.session.count({ where }),
  ]);

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      user: s.user.name || s.user.email,
      assessment: s.assessment.title,
      difficulty: s.assessment.difficulty,
      status: s.status,
      verdict: s.grade?.verdict || null,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      createdAt: s.createdAt,
    })),
    total,
    pages: Math.ceil(total / limit),
  });
}
