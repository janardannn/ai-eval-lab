import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

const PROBE_COOLDOWN = 150; // ~2.5 min between probes

interface ProbeResult {
  shouldProbe: boolean;
  question?: string;
  assessmentId?: string;
}

export async function checkForProbe(sessionId: string): Promise<ProbeResult> {
  const cooldownKey = `probe_cooldown:${sessionId}`;
  const onCooldown = await redis.exists(cooldownKey);
  if (onCooldown) return { shouldProbe: false };

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { assessmentId: true, assessment: { select: { labConfig: true } } },
  });

  if (!session) return { shouldProbe: false };

  const labConfig = session.assessment.labConfig as Record<string, unknown> | null;
  const probeQuestions = (labConfig?.probeQuestions as string[] | undefined) ?? [];

  if (probeQuestions.length === 0) return { shouldProbe: false };

  const idxKey = `probe_idx:${sessionId}`;
  const idx = await redis.incr(idxKey);
  await redis.expire(idxKey, 7200);

  // idx starts at 1 after first incr, so subtract 1 for 0-based index. Wrap around if more probes than questions.
  const question = probeQuestions[(idx - 1) % probeQuestions.length];

  await redis.set(cooldownKey, "1", "EX", PROBE_COOLDOWN);

  return { shouldProbe: true, question, assessmentId: session.assessmentId };
}
