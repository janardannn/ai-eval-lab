import { prisma } from "./db";
import { redis, getSessionState, setSessionState, removeContainerMapping, popFromQueue } from "./redis";
import { stopContainer } from "./docker";

export async function cleanupSession(sessionId: string) {
  const state = await getSessionState(sessionId);
  if (!state) return;

  if (state.containerId) {
    try {
      await stopContainer(state.containerId);
      await removeContainerMapping(state.containerId);
    } catch (err) {
      console.error(`cleanup: failed to stop container for ${sessionId}:`, err);
    }
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { status: "abandoned", endedAt: new Date() },
  });

  await setSessionState(sessionId, { status: "completed", phase: "grading" });
  await redis.del(`heartbeat:${sessionId}`);

  // Free capacity for next in queue
  const next = await popFromQueue();
  if (next) {
    // Trigger provisioning for the next queued session
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/session/${next}/provision`, {
      method: "POST",
    }).catch(() => {});
  }
}

export async function checkDeadSessions() {
  const activeSessions = await prisma.session.findMany({
    where: { status: "active" },
    select: { id: true, assessmentId: true, startedAt: true, assessment: { select: { timeLimit: true } } },
  });

  for (const session of activeSessions) {
    // Check heartbeat
    const lastBeat = await redis.get(`heartbeat:${session.id}`);
    if (!lastBeat) {
      console.log(`session ${session.id}: no heartbeat, cleaning up`);
      await cleanupSession(session.id);
      continue;
    }

    // Check time limit
    if (session.startedAt && session.assessment.timeLimit) {
      const elapsed = (Date.now() - session.startedAt.getTime()) / 1000;
      if (elapsed > session.assessment.timeLimit) {
        console.log(`session ${session.id}: time limit exceeded, cleaning up`);
        await cleanupSession(session.id);
      }
    }
  }
}
