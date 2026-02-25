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
import { jsonCompletion } from "@/lib/ai";

interface QuestionItem {
  text: string;
  followUps?: string[];
}

interface PhaseConfig {
  questions: QuestionItem[];
}

/**
 * Build the Q&A chain context for the current question's thread.
 * For follow-ups, includes the main question + all prior follow-ups and their answers
 * so the AI evaluator has full context of the conversation within this question.
 */
async function buildChainContext(
  sessionId: string,
  phase: string,
  config: PhaseConfig,
  qi: number,
  fi: number,
  currentQuestion: string,
  currentAnswer: string
): Promise<string> {
  // Main question with no follow-ups history — just Q and A
  if (fi === -1) {
    return `Question: ${currentQuestion}\nAnswer: ${currentAnswer}`;
  }

  // Follow-up: gather the full chain for this question
  const q = config.questions[qi];
  const chainParts: string[] = [];

  // The main question and all follow-ups up to (but not including) current are in the DB
  // Fetch QAPairs for this phase, ordered by timestamp
  const allPairs = await prisma.qAPair.findMany({
    where: { sessionId, phase },
    orderBy: { timestamp: "asc" },
  });

  // Find pairs belonging to this question's chain.
  // The main question text is q.text, follow-ups are q.followUps[0..fi-1]
  const chainQuestions = new Set<string>();
  chainQuestions.add(q.text);
  if (q.followUps) {
    for (let i = 0; i < fi; i++) {
      chainQuestions.add(q.followUps[i]);
    }
  }

  for (const pair of allPairs) {
    if (chainQuestions.has(pair.question)) {
      chainParts.push(`Q: ${pair.question}\nA: ${pair.answer}`);
    }
  }

  // Add the current follow-up being evaluated
  chainParts.push(`Q: ${currentQuestion}\nA: ${currentAnswer}`);

  return chainParts.join("\n\n");
}

/** Evaluate if the candidate's answer demonstrates adequate understanding */
async function evaluateAnswer(chainContext: string): Promise<boolean> {
  try {
    const result = await jsonCompletion<{ pass: boolean }>(
      `You are a strict technical evaluator for a skills assessment. You will be given a question (or a chain of questions and answers building on each other) and the candidate's latest answer. Determine if the latest answer demonstrates adequate understanding.

Respond with {"pass": true} or {"pass": false}.

PASS = the answer is substantive, logically sound, and shows genuine understanding of the concept.
FAIL = the answer is wrong, vague, off-topic, evasive, or shows no real understanding.

No partial credit. No explanation. Only output the JSON object.`,
      chainContext
    );
    return result.pass === true;
  } catch (err) {
    console.error("[AI Gate] evaluation failed:", err);
    // On failure, default to passing so we don't skip follow-ups due to AI errors
    return true;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
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

  // Determine next position
  if (pos.fi === -1) {
    // Just answered a main question
    if (!hasFollowUps) {
      // No follow-ups — advance to next main question
      await setQAPosition(sessionId, phase, { qi: pos.qi + 1, fi: -1 });
    } else {
      // Has follow-ups — evaluate if candidate deserves them
      const context = await buildChainContext(sessionId, phase, config, pos.qi, pos.fi, question, transcript);
      const passed = await evaluateAnswer(context);

      if (passed) {
        // Enter follow-up chain
        await setQAPosition(sessionId, phase, { qi: pos.qi, fi: 0 });
      } else {
        // Skip all follow-ups, next main question
        await setQAPosition(sessionId, phase, { qi: pos.qi + 1, fi: -1 });
      }
    }
  } else {
    // Just answered a follow-up
    const moreFollowUps = currentQ.followUps && pos.fi + 1 < currentQ.followUps.length;

    if (!moreFollowUps) {
      // No more follow-ups — advance to next main question
      await setQAPosition(sessionId, phase, { qi: pos.qi + 1, fi: -1 });
    } else {
      // More follow-ups exist — evaluate if we should continue deeper
      const context = await buildChainContext(sessionId, phase, config, pos.qi, pos.fi, question, transcript);
      const passed = await evaluateAnswer(context);

      if (passed) {
        // Next follow-up
        await setQAPosition(sessionId, phase, { qi: pos.qi, fi: pos.fi + 1 });
      } else {
        // Skip remaining follow-ups, next main question
        await setQAPosition(sessionId, phase, { qi: pos.qi + 1, fi: -1 });
      }
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
