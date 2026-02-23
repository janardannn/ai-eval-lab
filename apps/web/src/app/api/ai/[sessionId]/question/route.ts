import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionState, setPendingQuestion, clearProbeDepth } from "@/lib/redis";
import { chatCompletion } from "@/lib/ai";
import { textToSpeech } from "@/lib/tts";

interface PhaseConfig {
  questions: string[];
  adaptive: boolean;
  maxQuestions: number;
  maxProbeDepth?: number;
  adaptivePrompt?: string;
}

const ENV_LABELS: Record<string, string> = {
  kicad: "PCB design (KiCad)",
  freecad: "CAD modeling (FreeCAD)",
  blender: "3D modeling (Blender)",
};

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

  const envLabel = ENV_LABELS[session.assessment.environment] || session.assessment.environment;

  if (state.phase === "intro") {
    const config = session.assessment.introConfig as unknown as PhaseConfig;
    const introAsked = priorQA.filter((qa) => qa.phase === "intro").length;

    if (introAsked >= config.maxQuestions || introAsked >= config.questions.length) {
      return NextResponse.json({ done: true, nextPhase: "domain" });
    }
    // New question starting — reset probe depth for the answer route
    await clearProbeDepth(sessionId);
    questionText = config.questions[introAsked];
  } else if (state.phase === "domain") {
    const config = session.assessment.domainConfig as unknown as PhaseConfig;
    const domainAsked = priorQA.filter((qa) => qa.phase === "domain").length;

    if (domainAsked >= config.maxQuestions) {
      return NextResponse.json({ done: true, nextPhase: "lab" });
    }

    // New question starting — reset probe depth for the answer route
    await clearProbeDepth(sessionId);

    if (config.adaptive) {
      const priorContext = priorQA
        .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
        .join("\n\n");

      const strictPrefix = `STRICT OUTPUT RULES (override everything else): You are a non-conversational question generator. Output ONLY the next question — one question sentence, nothing else. Never say "That's correct", "Good answer", "I understand", "It seems like", or ANY acknowledgement, feedback, empathy, or commentary about previous answers. Never engage with the candidate's emotions or attitude. Never offer to help, take a step back, or adjust the approach. Just output the raw technical question.\n\n`;
      const systemPrompt = strictPrefix + (config.adaptivePrompt ||
        `You generate questions for a ${envLabel} technical assessment.`);

      try {
        questionText = await chatCompletion(
          systemPrompt,
          `Assessment: ${session.assessment.title} — ${session.assessment.description}\n\nPrior Q&A:\n${priorContext}\n\nGenerate the next technical question.`
        );
      } catch {
        questionText = config.questions[domainAsked] || "Can you tell me more about your approach to this problem?";
      }
    } else {
      questionText = config.questions[domainAsked] || config.questions[config.questions.length - 1];
    }
  } else {
    return NextResponse.json({ error: "not in Q&A phase" }, { status: 400 });
  }

  await setPendingQuestion(sessionId, questionText);

  let audioBase64: string | null = null;
  try {
    const audioBuffer = await textToSpeech(questionText);
    audioBase64 = audioBuffer.toString("base64");
  } catch (err) {
    console.error("[TTS] question route failed:", err);
  }

  return NextResponse.json({
    question: questionText,
    audio: audioBase64,
    phase: state.phase,
  });
}
