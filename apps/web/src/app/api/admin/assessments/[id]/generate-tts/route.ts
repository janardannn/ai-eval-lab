import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { textToSpeech, questionTextHash } from "@/lib/tts";

interface FollowUp {
  text: string;
  timeLimit?: number;
}

interface Question {
  text: string;
  timeLimit?: number;
  followUps?: (string | FollowUp)[];
}

interface PhaseConfig {
  questions: (string | Question)[];
}

function collectTexts(config: PhaseConfig | null | undefined): string[] {
  if (!config?.questions) return [];
  const texts: string[] = [];
  for (const q of config.questions) {
    if (typeof q === "string") {
      texts.push(q);
    } else {
      texts.push(q.text);
      if (q.followUps) {
        for (const f of q.followUps) {
          texts.push(typeof f === "string" ? f : f.text);
        }
      }
    }
  }
  return texts;
}

function dedup(texts: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of texts) {
    const h = questionTextHash(t);
    if (!seen.has(h)) {
      seen.add(h);
      unique.push(t);
    }
  }
  return unique;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const { id } = await params;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      try {
        const assessment = await prisma.assessment.findUnique({
          where: { id },
          select: { introConfig: true, domainConfig: true, labConfig: true },
        });

        if (!assessment) {
          send({ type: "error", error: "Assessment not found" });
          controller.close();
          return;
        }

        const introTexts = collectTexts(assessment.introConfig as unknown as PhaseConfig | null);
        const domainTexts = collectTexts(assessment.domainConfig as unknown as PhaseConfig | null);
        const labConfig = assessment.labConfig as Record<string, unknown> | null;
        const probeTexts = (labConfig?.probeQuestions as string[] | undefined) ?? [];
        const allTexts = dedup([...introTexts, ...domainTexts, ...probeTexts]);

        if (allTexts.length === 0) {
          send({ type: "done", total: 0, generated: 0, cached: 0, deleted: 0, failed: 0 });
          controller.close();
          return;
        }

        const currentHashes = new Set(allTexts.map((t) => questionTextHash(t)));

        const existing = await prisma.questionAudio.findMany({
          where: { assessmentId: id },
          select: { id: true, textHash: true },
        });

        const existingHashSet = new Set(existing.map((e) => e.textHash));

        const staleIds = existing
          .filter((e) => !currentHashes.has(e.textHash))
          .map((e) => e.id);

        if (staleIds.length > 0) {
          await prisma.questionAudio.deleteMany({
            where: { id: { in: staleIds } },
          });
        }

        const toGenerate = allTexts.filter((t) => !existingHashSet.has(questionTextHash(t)));
        const cached = allTexts.length - toGenerate.length;

        send({ type: "start", total: allTexts.length, toGenerate: toGenerate.length, cached });

        let generated = 0;
        let failed = 0;
        for (let i = 0; i < toGenerate.length; i++) {
          const text = toGenerate[i];
          const hash = questionTextHash(text);

          try {
            const audioBuffer = await textToSpeech(text);
            await prisma.questionAudio.create({
              data: {
                assessmentId: id,
                textHash: hash,
                questionText: text,
                audio: new Uint8Array(audioBuffer),
              },
            });
            generated++;
          } catch (err) {
            console.error(`[TTS] Failed for: "${text.substring(0, 60)}..."`, err);
            failed++;
          }

          send({ type: "progress", completed: i + 1, toGenerate: toGenerate.length });
        }

        send({
          type: "done",
          total: allTexts.length,
          generated,
          cached,
          deleted: staleIds.length,
          failed,
        });
      } catch (err) {
        console.error("[generate-tts] Unexpected error:", err);
        send({ type: "error", error: err instanceof Error ? err.message : "Internal server error" });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
