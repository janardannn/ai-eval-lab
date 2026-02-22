import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { cleanupSession } from "@/lib/session-cleanup";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      assessment: { select: { id: true, title: true, difficulty: true } },
      snapshots: { orderBy: { timestamp: "asc" }, select: { id: true, timestamp: true, data: true } },
      qaPairs: { orderBy: { timestamp: "asc" } },
      grade: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...session,
    adminOverride: session.adminOverride,
    adminNotes: session.adminNotes,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!session) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (session.status === "completed" || session.status === "abandoned") {
    return NextResponse.json({ error: "session already ended" }, { status: 400 });
  }

  await cleanupSession(id);
  return NextResponse.json({ ok: true });
}
