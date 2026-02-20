import { NextRequest, NextResponse } from "next/server";
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
  const { userId, taskId } = await req.json();

  if (!userId || !taskId) {
    return NextResponse.json({ error: "missing userId or taskId" }, { status: 400 });
  }

  const session = await prisma.session.create({
    data: { userId, taskId, status: "queued" },
  });

  await setSessionState(session.id, {
    userId,
    taskId,
    phase: "queued",
    status: "queued",
    startTime: new Date().toISOString(),
  });

  const activeCount = await getActiveContainerCount();

  if (activeCount < MAX_CONTAINERS) {
    await setSessionState(session.id, { status: "provisioning" });

    try {
      const { containerId, containerUrl } = await startKicadContainer(session.id);
      const ready = await waitForContainer(containerUrl);

      if (!ready) {
        return NextResponse.json(
          { error: "container failed to start" },
          { status: 500 }
        );
      }

      await setContainerMapping(containerId, session.id);
      await setSessionState(session.id, {
        status: "ready",
        phase: "intro",
        containerId,
        containerUrl,
      });
      await prisma.session.update({
        where: { id: session.id },
        data: { status: "active", containerId, startedAt: new Date() },
      });

      return NextResponse.json({ sessionId: session.id, status: "ready" });
    } catch (err) {
      console.error("container provisioning failed:", err);
      await addToQueue(session.id);
      return NextResponse.json({ sessionId: session.id, status: "queued" });
    }
  }

  await addToQueue(session.id);
  return NextResponse.json({ sessionId: session.id, status: "queued" });
}
