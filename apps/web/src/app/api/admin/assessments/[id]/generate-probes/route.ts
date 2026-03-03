import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { jsonCompletion } from "@/lib/ai";

const PROBE_INTERVAL = 150; // ~2.5 min between probes

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const { id } = await params;

  let title: string;
  let description: string;
  let timeLimit: number;
  let problemStatement: string | undefined;

  // Accept body data for creation flow (id === "new") or use DB
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await req.json();
    title = body.title;
    description = body.description;
    timeLimit = body.timeLimit;
    problemStatement = body.problemStatement;
  } else {
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      select: { title: true, description: true, timeLimit: true, labConfig: true },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    title = assessment.title;
    description = assessment.description;
    timeLimit = assessment.timeLimit;
    const labConfig = assessment.labConfig as Record<string, unknown> | null;
    problemStatement = labConfig?.problemStatement as string | undefined;
  }

  const count = Math.max(3, Math.floor(timeLimit / PROBE_INTERVAL));

  const questions = await jsonCompletion<{ questions: string[] }>(
    `You generate probing questions for an AI-proctored practical engineering exam. These questions are asked periodically during the hands-on lab to make the student explain their thinking process, justify design decisions, and describe what they are doing.

Rules:
- Generate exactly ${count} unique questions
- Each question should be 1-2 sentences max
- Focus on: thought process, design reasoning, approach justification, next steps, challenges faced
- Do NOT give hints, solutions, or specific technical guidance
- Early questions should be more general (what are you working on, what's your approach), later ones more specific (why did you choose this, what challenge are you facing)
- Questions should work for any student taking this assessment
- Return a JSON object with a "questions" array of strings`,
    `Assessment: ${title}\nDescription: ${description}${problemStatement ? `\nProblem Statement: ${problemStatement}` : ""}\nLab Duration: ${Math.round(timeLimit / 60)} minutes`
  );

  return NextResponse.json({ questions: questions.questions });
}
