import { NextRequest, NextResponse } from "next/server";
import { checkDeadSessions } from "@/lib/session-cleanup";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await checkDeadSessions();
  return NextResponse.json({ ok: true });
}
