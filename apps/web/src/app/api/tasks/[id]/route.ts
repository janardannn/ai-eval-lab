import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      difficulty: true,
      description: true,
      timeLimit: true,
      rubric: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

async function isAdmin() {
  const session = await auth();
  if (!session?.user?.email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  return adminEmails.includes(session.user.email);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, difficulty, description, timeLimit, rubric } = body;

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(difficulty && { difficulty }),
      ...(description && { description }),
      ...(timeLimit && { timeLimit: Number(timeLimit) }),
      ...(rubric && { rubric }),
    },
  });

  return NextResponse.json(task);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
