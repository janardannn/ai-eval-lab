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
  // Clean up active sessions with no heartbeat or exceeded time
  const activeSessions = await prisma.session.findMany({
    where: { status: "active" },
    select: { id: true, assessmentId: true, startedAt: true, assessment: { select: { timeLimit: true } } },
  });

  for (const session of activeSessions) {
    const lastBeat = await redis.get(`heartbeat:${session.id}`);
    if (!lastBeat) {
      console.log(`cleanup: ${session.id} no heartbeat`);
      await cleanupSession(session.id);
      continue;
    }

    if (session.startedAt && session.assessment.timeLimit) {
      const elapsed = (Date.now() - session.startedAt.getTime()) / 1000;
      if (elapsed > session.assessment.timeLimit) {
        console.log(`cleanup: ${session.id} time limit exceeded`);
        await cleanupSession(session.id);
      }
    }
  }

  // Clean up queued sessions older than 5 minutes with no Redis state
  const staleQueued = await prisma.session.findMany({
    where: {
      status: "queued",
      createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
    },
    select: { id: true },
  });

  for (const session of staleQueued) {
    const state = await getSessionState(session.id);
    if (!state) {
      console.log(`cleanup: ${session.id} stale queued session`);
      await prisma.session.update({
        where: { id: session.id },
        data: { status: "abandoned", endedAt: new Date() },
      });
    }
  }
}

// Auto-run cleanup every 60 seconds in the server process
let cleanupStarted = false;

export function startAutoCleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  setInterval(() => {
    checkDeadSessions().catch((err) =>
      console.error("auto-cleanup error:", err)
    );
  }, 60_000);
}
