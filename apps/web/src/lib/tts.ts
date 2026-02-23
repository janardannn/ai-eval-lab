import { GoogleGenAI } from "@google/genai";

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const VOICE = "Achernar";
const STYLE_PREFIX =
  "Say in a soft, calm, and professional tone with a subtle Indian English accent:";

export async function textToSpeech(text: string): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: `${STYLE_PREFIX} ${text}`,
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: VOICE },
        },
      },
    },
  });

  const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!data?.data) throw new Error("No audio in Gemini TTS response");

  const pcm = Buffer.from(data.data, "base64");

  // Wrap raw PCM (24kHz 16-bit mono) in a WAV header so browsers can decode it
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}
