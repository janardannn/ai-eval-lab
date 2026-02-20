import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const { id } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "no file provided" }, { status: 400 });
  }

  if (!file.name.endsWith(".kicad_pcb")) {
    return NextResponse.json(
      { error: "only .kicad_pcb files are accepted" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "file exceeds 10MB limit" },
      { status: 400 }
    );
  }

  const buffer = await file.arrayBuffer();

  const assessment = await prisma.assessment.update({
    where: { id },
    data: { referenceFile: new Uint8Array(buffer) },
    select: { id: true, title: true },
  });

  return NextResponse.json({
    ok: true,
    assessmentId: assessment.id,
    fileName: file.name,
    size: file.size,
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  const { id } = await params;

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    select: { referenceFile: true, title: true },
  });

  if (!assessment?.referenceFile) {
    return NextResponse.json({ error: "no reference file" }, { status: 404 });
  }

  return new NextResponse(assessment.referenceFile, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${assessment.title}.kicad_pcb"`,
    },
  });
}
