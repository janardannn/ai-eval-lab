import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  redis,
  getSessionState,
  setSessionState,
  removeContainerMapping,
  popFromQueue,
} from "@/lib/redis";
import { stopContainer, extractFile } from "@/lib/docker";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const state = await getSessionState(id);

  if (!state) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  if (state.containerId) {
    try {
      const fileBuffer = await extractFile(
        state.containerId,
        "/root/project.kicad_pcb"
      );
      await prisma.session.update({
        where: { id },
        data: { finalFile: new Uint8Array(fileBuffer) },
      });
    } catch (err) {
      console.error("failed to extract final file:", err);
    }

    try {
      await stopContainer(state.containerId);
      await removeContainerMapping(state.containerId);
    } catch (err) {
      console.error("failed to stop container:", err);
    }
  }

  await prisma.session.update({
    where: { id },
    data: { status: "completed", endedAt: new Date() },
  });

  await setSessionState(id, { status: "completed", phase: "grading" });
  await redis.del(`heartbeat:${id}`);

  // Trigger grading async
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/grader/${id}`, {
    method: "POST",
  }).catch((err) => console.error("failed to trigger grader:", err));

  // Free capacity for next queued session
  const nextSessionId = await popFromQueue();
  if (nextSessionId) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _provisionQueued: nextSessionId }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, sessionId: id });
}
