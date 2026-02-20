import { NextRequest, NextResponse } from "next/server";
import { getSessionState } from "@/lib/redis";
import { checkForNudge } from "@/lib/nudge";
import { textToSpeech } from "@/lib/tts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const state = await getSessionState(sessionId);

  if (!state || state.phase !== "lab") {
    return NextResponse.json({ nudge: false });
  }

  const result = await checkForNudge(sessionId);

  if (!result.shouldNudge || !result.message) {
    return NextResponse.json({ nudge: false });
  }

  let audioBase64: string | null = null;
  try {
    const audioBuffer = await textToSpeech(result.message);
    audioBase64 = audioBuffer.toString("base64");
  } catch {
    // TTS failed
  }

  return NextResponse.json({
    nudge: true,
    message: result.message,
    audio: audioBase64,
  });
}
