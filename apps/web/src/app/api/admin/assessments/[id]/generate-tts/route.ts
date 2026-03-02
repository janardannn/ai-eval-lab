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

function collectTexts(config: PhaseConfig): string[] {
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

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const { id } = await params;

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    select: { introConfig: true, domainConfig: true },
  });

  if (!assessment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const introTexts = collectTexts(assessment.introConfig as unknown as PhaseConfig);
  const domainTexts = collectTexts(assessment.domainConfig as unknown as PhaseConfig);
  const allTexts = [...introTexts, ...domainTexts];
  const currentHashes = new Set(allTexts.map((t) => questionTextHash(t)));

  const existing = await prisma.questionAudio.findMany({
    where: { assessmentId: id },
    select: { id: true, textHash: true },
  });

  const existingHashSet = new Set(existing.map((e) => e.textHash));

  // Delete stale audio (questions removed or text changed)
  const staleIds = existing
    .filter((e) => !currentHashes.has(e.textHash))
    .map((e) => e.id);

  if (staleIds.length > 0) {
    await prisma.questionAudio.deleteMany({
      where: { id: { in: staleIds } },
    });
  }

  // Generate TTS for new/changed questions
  let generated = 0;
  for (const text of allTexts) {
    const hash = questionTextHash(text);
    if (existingHashSet.has(hash)) continue;

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
  }

  return NextResponse.json({
    total: allTexts.length,
    generated,
    cached: allTexts.length - generated,
    deleted: staleIds.length,
  });
}
