import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { jsonCompletion } from "@/lib/ai";

const PROBE_INTERVAL = 150; // ~2.5 min between probes

interface LabConfig {
  problemStatement?: string;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const { id } = await params;

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    select: { title: true, description: true, timeLimit: true, labConfig: true },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const labConfig = assessment.labConfig as unknown as LabConfig | null;
  const count = Math.max(3, Math.floor(assessment.timeLimit / PROBE_INTERVAL));

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
    `Assessment: ${assessment.title}\nDescription: ${assessment.description}${labConfig?.problemStatement ? `\nProblem Statement: ${labConfig.problemStatement}` : ""}\nLab Duration: ${Math.round(assessment.timeLimit / 60)} minutes`
  );

  return NextResponse.json({ questions: questions.questions });
}
