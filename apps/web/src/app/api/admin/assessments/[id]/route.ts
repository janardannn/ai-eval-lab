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

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    select: {
      id: true, title: true, difficulty: true, description: true,
      environment: true, timeLimit: true, introConfig: true,
      domainConfig: true, labConfig: true, isActive: true,
      createdAt: true, updatedAt: true,
    },
  });
  if (!assessment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const hasRef = await prisma.assessment.count({
    where: { id, referenceFile: { not: null } },
  });

  return NextResponse.json({
    ...assessment,
    referenceFile: hasRef > 0,
  });
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
    data: body,
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
  await prisma.assessment.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
