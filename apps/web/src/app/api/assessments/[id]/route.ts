import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      difficulty: true,
      description: true,
      environment: true,
      timeLimit: true,
      introConfig: true,
      domainConfig: true,
      labConfig: true,
      isActive: true,
    },
  });

  if (!assessment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(assessment);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const { id } = await params;
  const body = await req.json();

  const assessment = await prisma.assessment.update({
    where: { id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.difficulty && { difficulty: body.difficulty }),
      ...(body.description && { description: body.description }),
      ...(body.environment && { environment: body.environment }),
      ...(body.timeLimit && { timeLimit: Number(body.timeLimit) }),
      ...(body.introConfig && { introConfig: body.introConfig }),
      ...(body.domainConfig && { domainConfig: body.domainConfig }),
      ...(body.labConfig && { labConfig: body.labConfig }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  return NextResponse.json(assessment);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const { id } = await params;
  await prisma.assessment.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
