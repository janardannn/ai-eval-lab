import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getSessionState,
  setSessionState,
  getPendingQuestion,
  getQAPosition,
  setQAPosition,
} from "@/lib/redis";
import { speechToText } from "@/lib/stt";
import { requireSessionOwner } from "@/lib/session-auth";

interface QuestionItem {
  text: string;
  followUps?: string[];
}

interface PhaseConfig {
  questions: QuestionItem[];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const denied = await requireSessionOwner(sessionId);
  if (denied) return denied;

  const state = await getSessionState(sessionId);

  if (!state) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  // Transcribe audio or read text
  let transcript: string;
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    transcript = body.transcript;
  } else {
    const audioBuffer = Buffer.from(await req.arrayBuffer());
    transcript = await speechToText(audioBuffer);
  }

  if (!transcript) {
    return NextResponse.json({ error: "no transcript" }, { status: 400 });
  }

  // Fetch session + assessment
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { assessment: true },
  });

  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const phase = state.phase;
  const pendingQ = await getPendingQuestion(sessionId);
  const question = pendingQ || "unknown question";

  // Save Q&A pair
  await prisma.qAPair.create({
    data: {
      sessionId,
      phase,
      question,
      answer: transcript,
      timestamp: Date.now() / 1000,
    },
  });

  // Get config and current position
  let config: PhaseConfig;
  let nextPhase: string;

  if (phase === "intro") {
    config = session.assessment.introConfig as unknown as PhaseConfig;
    nextPhase = "domain";
  } else if (phase === "domain") {
    config = session.assessment.domainConfig as unknown as PhaseConfig;
    nextPhase = "lab";
  } else {
    return NextResponse.json({ error: "not in Q&A phase" }, { status: 400 });
  }

  const pos = await getQAPosition(sessionId, phase);
  const currentQ = config.questions[pos.qi];
  const hasFollowUps = currentQ.followUps && currentQ.followUps.length > 0;

  // Advance position — always ask all follow-ups sequentially
  if (pos.fi === -1) {
    if (hasFollowUps) {
      await setQAPosition(sessionId, phase, { qi: pos.qi, fi: 0 });
    } else {
      await setQAPosition(sessionId, phase, { qi: pos.qi + 1, fi: -1 });
    }
  } else {
    const moreFollowUps = currentQ.followUps && pos.fi + 1 < currentQ.followUps.length;
    if (moreFollowUps) {
      await setQAPosition(sessionId, phase, { qi: pos.qi, fi: pos.fi + 1 });
    } else {
      await setQAPosition(sessionId, phase, { qi: pos.qi + 1, fi: -1 });
    }
  }

  // Check if phase is complete
  const newPos = await getQAPosition(sessionId, phase);
  if (newPos.qi >= config.questions.length) {
    await setSessionState(sessionId, { phase: nextPhase as SessionState["phase"] });
    return NextResponse.json({ eval: "done", nextPhase });
  }

  return NextResponse.json({ eval: "next" });
}

type SessionState = import("@/lib/redis").SessionState;
