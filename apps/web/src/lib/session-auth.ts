import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function requireSessionOwner(
  sessionId: string
): Promise<NextResponse | null> {
  const authSession = await auth();
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authSession.user.id },
    select: { isAdmin: true },
  });

  if (user?.isAdmin) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });

  if (!session || session.userId !== authSession.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return null;
}

export function requireInternalSecret(req: NextRequest): NextResponse | null {
  const secret = req.headers.get("x-internal-secret");
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
