import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function speechToText(audioBuffer: Buffer): Promise<string> {
  const file = new File([audioBuffer], "audio.webm", { type: "audio/webm" });

  const transcription = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
  });

  return transcription.text;
}
