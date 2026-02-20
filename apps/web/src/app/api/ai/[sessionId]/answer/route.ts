import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionState, setSessionState, getPendingQuestion, setPendingQuestion } from "@/lib/redis";
import { speechToText } from "@/lib/stt";
import { jsonCompletion } from "@/lib/ai";
import { textToSpeech } from "@/lib/tts";

const MAX_DOMAIN_QUESTIONS = 5;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const state = await getSessionState(sessionId);

  if (!state) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  let transcript: string;
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    transcript = body.transcript;
  } else {
    // Audio blob — run STT
    const audioBuffer = Buffer.from(await req.arrayBuffer());
    transcript = await speechToText(audioBuffer);
  }

  if (!transcript) {
    return NextResponse.json({ error: "no transcript" }, { status: 400 });
  }

  const pendingQ = await getPendingQuestion(sessionId);
  const question = pendingQ || "unknown question";

  await prisma.qAPair.create({
    data: {
      sessionId,
      phase: state.phase,
      question,
      answer: transcript,
      timestamp: Date.now() / 1000,
    },
  });

  if (state.phase === "intro") {
    const introCount = await prisma.qAPair.count({
      where: { sessionId, phase: "intro" },
    });

    if (introCount >= 3) {
      await setSessionState(sessionId, { phase: "domain" });
      return NextResponse.json({ eval: "done", nextPhase: "domain" });
    }

    return NextResponse.json({ eval: "next" });
  }

  // Domain phase — evaluate answer and decide probe vs next
  let evalResult: { action: "probe" | "next" | "done"; followUp?: string; score?: number };
  try {
    evalResult = await jsonCompletion<typeof evalResult>(
      `You evaluate technical answers in a PCB design interview. Return JSON with:
- action: "probe" if the answer needs clarification, "next" to move on, "done" if enough questions asked
- followUp: a follow-up question if action is "probe"
- score: 1-10 rating of the answer quality`,
      `Answer: "${transcript}"\n\nIs this answer sufficient or should we probe deeper?`
    );
  } catch {
    evalResult = { action: "next", score: 5 };
  }

  // Update the QA pair with eval
  const latestQA = await prisma.qAPair.findFirst({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
  });
  if (latestQA) {
    await prisma.qAPair.update({
      where: { id: latestQA.id },
      data: { eval: evalResult },
    });
  }

  const domainCount = await prisma.qAPair.count({
    where: { sessionId, phase: "domain" },
  });

  if (domainCount >= MAX_DOMAIN_QUESTIONS || evalResult.action === "done") {
    await setSessionState(sessionId, { phase: "lab" });
    return NextResponse.json({ eval: "done", nextPhase: "lab" });
  }

  if (evalResult.action === "probe" && evalResult.followUp) {
    await setPendingQuestion(sessionId, evalResult.followUp);

    let audioBase64: string | null = null;
    try {
      const audioBuffer = await textToSpeech(evalResult.followUp);
      audioBase64 = audioBuffer.toString("base64");
    } catch {
      // TTS failed — text-only fallback
    }

    return NextResponse.json({
      eval: "probe",
      followUp: evalResult.followUp,
      audio: audioBase64,
    });
  }

  return NextResponse.json({ eval: "next" });
}
