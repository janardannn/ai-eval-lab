import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const tasks = await prisma.task.findMany({
    select: {
      id: true,
      title: true,
      difficulty: true,
      description: true,
      timeLimit: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(tasks);
}
