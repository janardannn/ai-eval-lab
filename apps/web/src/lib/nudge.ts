import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { chatCompletion } from "@/lib/ai";

const STAGNATION_THRESHOLD = 300; // 5 minutes without changes
const NUDGE_COOLDOWN = 180; // 3 min between nudges

interface NudgeResult {
  shouldNudge: boolean;
  message?: string;
}

export async function checkForNudge(sessionId: string): Promise<NudgeResult> {
  const cooldownKey = `nudge_cooldown:${sessionId}`;
  const onCooldown = await redis.exists(cooldownKey);
  if (onCooldown) return { shouldNudge: false };

  const now = Date.now() / 1000;
  const latestSnapshot = await prisma.snapshot.findFirst({
    where: { sessionId },
    orderBy: { timestamp: "desc" },
  });

  if (!latestSnapshot) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { startedAt: true },
    });
    if (!session?.startedAt) return { shouldNudge: false };

    const elapsed = now - session.startedAt.getTime() / 1000;
    if (elapsed > STAGNATION_THRESHOLD) {
      return generateNudge(sessionId, "no_activity");
    }
    return { shouldNudge: false };
  }

  const timeSinceLastChange = now - latestSnapshot.timestamp;
  if (timeSinceLastChange < STAGNATION_THRESHOLD) {
    return { shouldNudge: false };
  }

  return generateNudge(sessionId, "stagnation");
}

async function generateNudge(
  sessionId: string,
  reason: "no_activity" | "stagnation"
): Promise<NudgeResult> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { task: { select: { title: true, description: true } } },
  });

  if (!session) return { shouldNudge: false };

  const prompts: Record<string, string> = {
    no_activity: `The student hasn't made any changes to the PCB board yet. They may be reading the task or feeling overwhelmed. Generate a gentle, encouraging nudge that reminds them of the task without giving hints.`,
    stagnation: `The student hasn't made changes to the PCB board for over 5 minutes. They may be stuck. Generate a gentle nudge that encourages them to continue working without revealing the solution.`,
  };

  const message = await chatCompletion(
    `You are an AI exam proctor. Generate a brief, encouraging nudge (1-2 sentences) for a student taking a PCB design assessment. Do NOT give hints, solutions, or specific guidance about the task. Be conversational and supportive.`,
    `Task: ${session.task.title} — ${session.task.description}\n\n${prompts[reason]}`
  );

  await redis.set(`nudge_cooldown:${sessionId}`, "1", "EX", NUDGE_COOLDOWN);

  return { shouldNudge: true, message };
}
