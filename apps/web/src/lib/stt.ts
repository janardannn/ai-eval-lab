import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const STT_MODEL = process.env.GEMINI_STT_MODEL || "gemini-2.5-flash";

export async function speechToText(audioBuffer: Buffer): Promise<string> {
  const base64Audio = audioBuffer.toString("base64");

  const response = await ai.models.generateContent({
    model: STT_MODEL,
    contents: [
      { text: "Transcribe this audio exactly. Return only the transcript text, nothing else." },
      {
        inlineData: {
          mimeType: "audio/webm",
          data: base64Audio,
        },
      },
    ],
  });

  return (response.text ?? "").trim();
}
