import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const { id } = await params;
  const { verdict, notes } = await req.json();

  if (!verdict) {
    return NextResponse.json({ error: "missing verdict" }, { status: 400 });
  }

  await prisma.session.update({
    where: { id },
    data: {
      adminOverride: verdict,
      adminNotes: notes || null,
    },
  });

  return NextResponse.json({ ok: true });
}
