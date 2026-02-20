import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const assessments = await prisma.assessment.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      difficulty: true,
      description: true,
      environment: true,
      timeLimit: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(assessments);
}

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const body = await req.json();
  const { title, difficulty, description, environment, timeLimit, introConfig, domainConfig, labConfig } = body;

  if (!title || !difficulty || !description || !timeLimit || !introConfig || !domainConfig || !labConfig) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const assessment = await prisma.assessment.create({
    data: {
      title,
      difficulty,
      description,
      environment: environment || "kicad",
      timeLimit: Number(timeLimit),
      introConfig,
      domainConfig,
      labConfig,
    },
  });

  return NextResponse.json(assessment, { status: 201 });
}
