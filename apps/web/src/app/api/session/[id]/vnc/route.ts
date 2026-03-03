import { NextRequest, NextResponse } from "next/server";
import { getSessionState } from "@/lib/redis";
import { requireSessionOwner } from "@/lib/session-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const denied = await requireSessionOwner(id);
  if (denied) return denied;

  const state = await getSessionState(id);
  if (!state?.containerUrl) {
    return NextResponse.json({ error: "container not ready" }, { status: 404 });
  }

  return NextResponse.redirect(`${state.containerUrl}/vnc.html?autoconnect=true&resize=scale`);
}
