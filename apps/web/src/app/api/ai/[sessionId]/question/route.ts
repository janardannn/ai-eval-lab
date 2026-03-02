import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionState, getQAPosition, setPendingQuestion } from "@/lib/redis";
import { textToSpeech } from "@/lib/tts";

interface FollowUpItem {
  text: string;
  timeLimit?: number;
}

interface QuestionItem {
  text: string;
  timeLimit?: number;
  followUps?: (string | FollowUpItem)[];
}

interface PhaseConfig {
  questions: (QuestionItem | string)[];
}

interface QuestionResult {
  text: string;
  timeLimit: number;
}

/** Look up the current question and its timeLimit based on position */
function getQuestionAtPosition(config: PhaseConfig, qi: number, fi: number): QuestionResult | null {
  if (qi >= config.questions.length) return null;
  const q = config.questions[qi];
  const parentTimeLimit = typeof q === "string" ? 0 : (q.timeLimit || 0);

  if (fi === -1) {
    const text = typeof q === "string" ? q : q.text;
    return { text, timeLimit: parentTimeLimit };
  }

  if (typeof q !== "string" && q.followUps && fi < q.followUps.length) {
    const f = q.followUps[fi];
    if (typeof f === "string") return { text: f, timeLimit: parentTimeLimit };
    return { text: f.text, timeLimit: f.timeLimit || parentTimeLimit };
  }

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

  let result: QuestionResult | null;

  if (state.phase === "intro") {
    const config = session.assessment.introConfig as unknown as PhaseConfig;
    const pos = await getQAPosition(sessionId, "intro");

    if (pos.qi >= config.questions.length) {
      return NextResponse.json({ done: true, nextPhase: "domain" });
    }

    result = getQuestionAtPosition(config, pos.qi, pos.fi);
  } else if (state.phase === "domain") {
    const config = session.assessment.domainConfig as unknown as PhaseConfig;
    const pos = await getQAPosition(sessionId, "domain");

    if (pos.qi >= config.questions.length) {
      return NextResponse.json({ done: true, nextPhase: "lab" });
    }

    result = getQuestionAtPosition(config, pos.qi, pos.fi);
  } else {
    return NextResponse.json({ error: "not in Q&A phase" }, { status: 400 });
  }

  if (!result) {
    return NextResponse.json({ error: "invalid question position" }, { status: 500 });
  }

  await setPendingQuestion(sessionId, result.text);

  let audioBase64: string | null = null;
  try {
    const audioBuffer = await textToSpeech(result.text);
    audioBase64 = audioBuffer.toString("base64");
  } catch (err) {
    console.error("[TTS] question route failed:", err);
  }

  return NextResponse.json({
    question: result.text,
    audio: audioBase64,
    phase: state.phase,
    timeLimit: result.timeLimit,
  });
}
