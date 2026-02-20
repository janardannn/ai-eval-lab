import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionState, setPendingQuestion } from "@/lib/redis";
import { chatCompletion } from "@/lib/ai";
import { textToSpeech } from "@/lib/tts";

interface IntroConfig {
  questions: string[];
  adaptive: boolean;
  maxQuestions: number;
}

interface DomainConfig {
  questions: string[];
  adaptive: boolean;
  maxQuestions: number;
  adaptivePrompt?: string;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const state = await getSessionState(sessionId);

  if (!state) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { assessment: true },
  });

  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const priorQA = await prisma.qAPair.findMany({
    where: { sessionId },
    orderBy: { timestamp: "asc" },
  });

  let questionText: string;

  if (state.phase === "intro") {
    const introConfig = session.assessment.introConfig as unknown as IntroConfig;
    const introAsked = priorQA.filter((qa) => qa.phase === "intro").length;

    if (introAsked >= introConfig.maxQuestions || introAsked >= introConfig.questions.length) {
      return NextResponse.json({ done: true, nextPhase: "domain" });
    }
    questionText = introConfig.questions[introAsked];
  } else if (state.phase === "domain") {
    const domainConfig = session.assessment.domainConfig as unknown as DomainConfig;
    const domainAsked = priorQA.filter((qa) => qa.phase === "domain").length;

    if (domainAsked >= domainConfig.maxQuestions) {
      return NextResponse.json({ done: true, nextPhase: "lab" });
    }

    if (domainConfig.adaptive) {
      const priorContext = priorQA
        .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
        .join("\n\n");

      const systemPrompt = domainConfig.adaptivePrompt ||
        `You are a technical interviewer for a PCB design assessment. Generate one focused technical question based on the task and prior answers. Be conversational but probing.`;

      try {
        questionText = await chatCompletion(
          systemPrompt,
          `Assessment: ${session.assessment.title} — ${session.assessment.description}\n\nPrior Q&A:\n${priorContext}\n\nGenerate the next technical question.`
        );
      } catch {
        questionText = domainConfig.questions[domainAsked] || "Can you tell me more about your approach to this problem?";
      }
    } else {
      questionText = domainConfig.questions[domainAsked] || domainConfig.questions[domainConfig.questions.length - 1];
    }
  } else {
    return NextResponse.json({ error: "not in Q&A phase" }, { status: 400 });
  }

  await setPendingQuestion(sessionId, questionText);

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
