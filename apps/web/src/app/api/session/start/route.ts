import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  setSessionState,
  addToQueue,
  getActiveContainerCount,
  setContainerMapping,
} from "@/lib/redis";
import { startKicadContainer, waitForContainer } from "@/lib/docker";

const MAX_CONTAINERS = parseInt(process.env.MAX_CONTAINERS || "3");

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { taskId } = await req.json();
  if (!taskId) {
    return NextResponse.json({ error: "missing taskId" }, { status: 400 });
  }

  const userId = session.user.id;

  const examSession = await prisma.session.create({
    data: { userId, taskId, status: "queued" },
  });

  await setSessionState(examSession.id, {
    userId,
    taskId,
    phase: "queued",
    status: "queued",
    startTime: new Date().toISOString(),
  });

  const activeCount = await getActiveContainerCount();

  if (activeCount < MAX_CONTAINERS) {
    await setSessionState(examSession.id, { status: "provisioning" });

    try {
      const { containerId, containerUrl } = await startKicadContainer(examSession.id);
      const ready = await waitForContainer(containerUrl);

      if (!ready) {
        return NextResponse.json(
          { error: "container failed to start" },
          { status: 500 }
        );
      }

      await setContainerMapping(containerId, examSession.id);
      await setSessionState(examSession.id, {
        status: "ready",
        phase: "intro",
        containerId,
        containerUrl,
      });
      await prisma.session.update({
        where: { id: examSession.id },
        data: { status: "active", containerId, startedAt: new Date() },
      });

      return NextResponse.json({ sessionId: examSession.id, status: "ready" });
    } catch (err) {
      console.error("container provisioning failed:", err);
      await addToQueue(examSession.id);
      return NextResponse.json({ sessionId: examSession.id, status: "queued" });
    }
  }

  await addToQueue(examSession.id);
  return NextResponse.json({ sessionId: examSession.id, status: "queued" });
}
