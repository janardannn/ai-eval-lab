import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionState } from "@/lib/redis";
import { chatCompletion } from "@/lib/ai";
import { textToSpeech } from "@/lib/tts";

const INTRO_QUESTIONS = [
  "Tell me about yourself and your background.",
  "What's your experience with PCB design or electronics?",
  "What motivated you to take this assessment?",
];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const state = await getSessionState(sessionId);

  if (!state) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const priorQA = await prisma.qAPair.findMany({
    where: { sessionId },
    orderBy: { timestamp: "asc" },
  });

  let questionText: string;

  if (state.phase === "intro") {
    const introAsked = priorQA.filter((qa) => qa.phase === "intro").length;
    if (introAsked >= INTRO_QUESTIONS.length) {
      return NextResponse.json({ done: true, nextPhase: "domain" });
    }
    questionText = INTRO_QUESTIONS[introAsked];
  } else if (state.phase === "domain") {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { task: true },
    });

    const priorContext = priorQA
      .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
      .join("\n\n");

    questionText = await chatCompletion(
      `You are a technical interviewer for a PCB design assessment. Generate one focused technical question about the task the student is about to perform. Base it on the task description and their prior answers. Be conversational but probing.`,
      `Task: ${session?.task.title} — ${session?.task.description}\n\nPrior Q&A:\n${priorContext}\n\nGenerate the next technical question.`
    );
  } else {
    return NextResponse.json({ error: "not in Q&A phase" }, { status: 400 });
  }

  let audioBase64: string | null = null;
  try {
    const audioBuffer = await textToSpeech(questionText);
    audioBase64 = audioBuffer.toString("base64");
  } catch {
    // TTS failed — text-only fallback
  }

  return NextResponse.json({
    question: questionText,
    audio: audioBase64,
    phase: state.phase,
  });
}
