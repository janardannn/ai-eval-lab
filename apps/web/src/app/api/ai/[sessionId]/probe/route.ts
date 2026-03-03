import { NextRequest, NextResponse } from "next/server";
import { getSessionState, setPendingQuestion } from "@/lib/redis";
import { checkForProbe } from "@/lib/probe";
import { textToSpeech } from "@/lib/tts";
import { requireSessionOwner } from "@/lib/session-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const denied = await requireSessionOwner(sessionId);
  if (denied) return denied;

  const state = await getSessionState(sessionId);

  if (!state || state.phase !== "lab") {
    return NextResponse.json({ probe: false });
  }

  const result = await checkForProbe(sessionId);

  if (!result.shouldProbe || !result.question) {
    return NextResponse.json({ probe: false });
  }

  await setPendingQuestion(sessionId, result.question);

  let audioBase64: string | null = null;
  try {
    const audioBuffer = await textToSpeech(result.question);
    audioBase64 = audioBuffer.toString("base64");
  } catch (err) {
    console.error("[TTS] probe route failed:", err);
  }

  return NextResponse.json({
    probe: true,
    question: result.question,
    audio: audioBase64,
  });
}
