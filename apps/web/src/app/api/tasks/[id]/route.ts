import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
