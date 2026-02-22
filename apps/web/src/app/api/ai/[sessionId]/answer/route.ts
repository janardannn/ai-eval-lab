import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getSessionState,
  setSessionState,
  getPendingQuestion,
  setPendingQuestion,
  getProbeDepth,
  setProbeDepth,
  clearProbeDepth,
} from "@/lib/redis";
import { speechToText } from "@/lib/stt";
import { jsonCompletion } from "@/lib/ai";
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

  const pendingQ = await getPendingQuestion(sessionId);
  const question = pendingQ || "unknown question";

  // Save Q&A pair
  await prisma.qAPair.create({
    data: {
      sessionId,
      phase: state.phase,
      question,
      answer: transcript,
      timestamp: Date.now() / 1000,
    },
  });

  const environment = session.assessment.environment;
  const envLabel = ENV_LABELS[environment] || environment;

  // --- INTRO PHASE ---
  if (state.phase === "intro") {
    const config = session.assessment.introConfig as unknown as PhaseConfig;
    const introCount = await prisma.qAPair.count({
      where: { sessionId, phase: "intro" },
    });

    if (introCount >= config.maxQuestions) {
      await clearProbeDepth(sessionId);
      await setSessionState(sessionId, { phase: "domain" });
      return NextResponse.json({ eval: "done", nextPhase: "domain" });
    }

    // Not adaptive → just move on
    if (!config.adaptive) {
      return NextResponse.json({ eval: "next" });
    }

    // Adaptive — check probe depth
    return handleAdaptiveProbe(sessionId, session.assessment, config, transcript, envLabel, "intro");
  }

  // --- DOMAIN PHASE ---
  if (state.phase === "domain") {
    const config = session.assessment.domainConfig as unknown as PhaseConfig;
    const domainCount = await prisma.qAPair.count({
      where: { sessionId, phase: "domain" },
    });

    if (domainCount >= config.maxQuestions) {
      await clearProbeDepth(sessionId);
      await setSessionState(sessionId, { phase: "lab" });
      return NextResponse.json({ eval: "done", nextPhase: "lab" });
    }

    // Not adaptive → just move on
    if (!config.adaptive) {
      return NextResponse.json({ eval: "next" });
    }

    // Adaptive — check probe depth
    return handleAdaptiveProbe(sessionId, session.assessment, config, transcript, envLabel, "domain");
  }

  return NextResponse.json({ error: "not in Q&A phase" }, { status: 400 });
}

async function handleAdaptiveProbe(
  sessionId: string,
  assessment: { title: string; description: string },
  config: PhaseConfig,
  transcript: string,
  envLabel: string,
  phase: "intro" | "domain"
): Promise<NextResponse> {
  const maxDepth = config.maxProbeDepth ?? 0;

  // Check remaining probe depth for this question chain
  let remaining = await getProbeDepth(sessionId);
  if (remaining === -1) {
    // First answer in a new question chain — initialize
    remaining = maxDepth;
    await setProbeDepth(sessionId, remaining);
  }

  // No probes left → move on, reset for next question chain
  if (remaining <= 0) {
    await clearProbeDepth(sessionId);
    return NextResponse.json({ eval: "next" });
  }

  // Ask Gemini: is cross-questioning warranted?
  let evalResult: {
    shouldProbe: boolean;
    followUp?: string;
    score?: number;
  };

  try {
    evalResult = await jsonCompletion<typeof evalResult>(
      `You evaluate answers in a ${envLabel} assessment. The assessment is: "${assessment.title}".
Return JSON with:
- shouldProbe (boolean): true ONLY if the answer is vague, incomplete, or reveals a misconception worth exploring. false if the answer is clear and sufficient.
- followUp (string): if shouldProbe is true, a concise follow-up question that digs into the weak point.
- score (number 1-10): quality rating of the answer.`,
      `Assessment context: ${assessment.description}\n\nAnswer: "${transcript}"\n\nShould this answer be cross-questioned?`
    );
  } catch {
    // Gemini failed — don't probe, move on
    await clearProbeDepth(sessionId);
    return NextResponse.json({ eval: "next" });
  }

  // Update the QA pair with eval
  const latestQA = await prisma.qAPair.findFirst({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
  });
  if (latestQA) {
    await prisma.qAPair.update({
      where: { id: latestQA.id },
      data: { eval: { shouldProbe: evalResult.shouldProbe, score: evalResult.score } },
    });
  }

  // Gemini says no probe needed → move on
  if (!evalResult.shouldProbe || !evalResult.followUp) {
    await clearProbeDepth(sessionId);
    return NextResponse.json({ eval: "next" });
  }

  // Probe — decrement depth and send follow-up
  await setProbeDepth(sessionId, remaining - 1);
  await setPendingQuestion(sessionId, evalResult.followUp);

  let audioBase64: string | null = null;
  try {
    const audioBuffer = await textToSpeech(evalResult.followUp);
    audioBase64 = audioBuffer.toString("base64");
  } catch {
    // TTS failed — text-only fallback
  }

  // Check if next phase transition needed
  const nextPhase = phase === "intro" ? "domain" : "lab";
  const totalCount = await prisma.qAPair.count({
    where: { sessionId, phase },
  });

  if (totalCount >= config.maxQuestions) {
    await clearProbeDepth(sessionId);
    await setSessionState(sessionId, { phase: nextPhase });
    return NextResponse.json({ eval: "done", nextPhase });
  }

  return NextResponse.json({
    eval: "probe",
    followUp: evalResult.followUp,
    audio: audioBase64,
  });
}
