import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

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

async function isAdmin() {
  const session = await auth();
  if (!session?.user?.email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  return adminEmails.includes(session.user.email);
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { title, difficulty, description, timeLimit, rubric } = body;

  if (!title || !difficulty || !description || !timeLimit || !rubric) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title,
      difficulty,
      description,
      timeLimit: Number(timeLimit),
      rubric,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
