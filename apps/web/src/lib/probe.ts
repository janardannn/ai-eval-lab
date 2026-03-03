import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { chatCompletion } from "@/lib/ai";

const PROBE_COOLDOWN = 150; // ~2.5 min between probes

interface ProbeResult {
  shouldProbe: boolean;
  question?: string;
}

export async function checkForProbe(sessionId: string): Promise<ProbeResult> {
  const cooldownKey = `probe_cooldown:${sessionId}`;
  const onCooldown = await redis.exists(cooldownKey);
  if (onCooldown) return { shouldProbe: false };

  return generateProbe(sessionId, cooldownKey);
}

async function generateProbe(sessionId: string, cooldownKey: string): Promise<ProbeResult> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { assessment: { select: { title: true, description: true } } },
  });

  if (!session) return { shouldProbe: false };

  const recentQA = await prisma.qAPair.findMany({
    where: { sessionId, phase: "lab" },
    orderBy: { timestamp: "desc" },
    take: 3,
    select: { question: true, answer: true },
  });

  const probeCount = await redis.incr(`probe_count:${sessionId}`);
  await redis.expire(`probe_count:${sessionId}`, 7200);

  const pastContext = recentQA.length > 0
    ? `\nPrevious probes (avoid repeating similar questions):\n${recentQA.map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n\n")}`
    : "";

  const question = await chatCompletion(
    `You are an AI exam proctor observing a student working on a practical engineering task. Your job is to periodically probe the student to explain their thinking process, justify their design decisions, and describe what they are doing.

Rules:
- Ask ONE concise question (1-2 sentences max)
- Focus on their current thought process, design reasoning, or next steps
- Do NOT give hints, solutions, or specific guidance
- Do NOT repeat questions similar to ones already asked
- Vary between asking about: what they're doing now, why they chose an approach, what they plan next, how they're solving a specific challenge
- This is probe #${probeCount} — adjust depth accordingly (early probes can be more general, later ones more specific)
- Output ONLY the question text, nothing else`,
    `Task: ${session.assessment.title} — ${session.assessment.description}${pastContext}`
  );

  await redis.set(cooldownKey, "1", "EX", PROBE_COOLDOWN);

  return { shouldProbe: true, question: question.trim() };
}
