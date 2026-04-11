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
import { startAutoCleanup } from "@/lib/session-cleanup";
import { requireInternalSecret } from "@/lib/session-auth";

const MAX_CONTAINERS = parseInt(process.env.MAX_CONTAINERS || "3");

startAutoCleanup();

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Internal call to provision a queued session (from end route)
  if (body._provisionQueued) {
    const denied = requireInternalSecret(req);
    if (denied) return denied;
    return provisionQueued(body._provisionQueued);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { assessmentId } = body;
  if (!assessmentId) {
    return NextResponse.json({ error: "missing assessmentId" }, { status: 400 });
  }

  const userId = session.user.id;

  const examSession = await prisma.session.create({
    data: { userId, assessmentId, status: "queued" },
  });

  await setSessionState(examSession.id, {
    userId,
    assessmentId,
    phase: "queued",
    status: "queued",
    startTime: new Date().toISOString(),
  });

  const activeCount = await getActiveContainerCount();

  if (activeCount < MAX_CONTAINERS) {
    await setSessionState(examSession.id, { status: "provisioning" });

    try {
      const { containerId, containerUrl, internalUrl } = await startKicadContainer(examSession.id);
      const ready = await waitForContainer(internalUrl);

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

async function provisionQueued(sessionId: string) {
  await setSessionState(sessionId, { status: "provisioning" });

  try {
    const { containerId, containerUrl, internalUrl } = await startKicadContainer(sessionId);
    const ready = await waitForContainer(internalUrl);

    if (!ready) {
      return NextResponse.json({ error: "container failed to start" }, { status: 500 });
    }

    await setContainerMapping(containerId, sessionId);
    await setSessionState(sessionId, {
      status: "ready",
      phase: "intro",
      containerId,
      containerUrl,
    });
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "active", containerId, startedAt: new Date() },
    });

    return NextResponse.json({ sessionId, status: "ready" });
  } catch (err) {
    console.error("queued container provisioning failed:", err);
    return NextResponse.json({ error: "provisioning failed" }, { status: 500 });
  }
}
