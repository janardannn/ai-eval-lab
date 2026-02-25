import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionState, getQAPosition, setPendingQuestion } from "@/lib/redis";
import { textToSpeech } from "@/lib/tts";

interface QuestionItem {
  text: string;
  followUps?: string[];
}

interface PhaseConfig {
  questions: QuestionItem[];
}

/** Look up the current question based on position */
function getQuestionAtPosition(config: PhaseConfig, qi: number, fi: number): string | null {
  if (qi >= config.questions.length) return null;
  const q = config.questions[qi];
  if (fi === -1) return q.text;
  if (q.followUps && fi < q.followUps.length) return q.followUps[fi];
  return null;
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

  let questionText: string | null;

  if (state.phase === "intro") {
    const config = session.assessment.introConfig as unknown as PhaseConfig;
    const pos = await getQAPosition(sessionId, "intro");

    if (pos.qi >= config.questions.length) {
      return NextResponse.json({ done: true, nextPhase: "domain" });
    }

    questionText = getQuestionAtPosition(config, pos.qi, pos.fi);
  } else if (state.phase === "domain") {
    const config = session.assessment.domainConfig as unknown as PhaseConfig;
    const pos = await getQAPosition(sessionId, "domain");

    if (pos.qi >= config.questions.length) {
      return NextResponse.json({ done: true, nextPhase: "lab" });
    }

    questionText = getQuestionAtPosition(config, pos.qi, pos.fi);
  } else {
    return NextResponse.json({ error: "not in Q&A phase" }, { status: 400 });
  }

  if (!questionText) {
    return NextResponse.json({ error: "invalid question position" }, { status: 500 });
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
