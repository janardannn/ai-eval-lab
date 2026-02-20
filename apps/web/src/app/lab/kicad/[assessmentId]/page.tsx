import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StartExamButton } from "./start-button";

export const dynamic = "force-dynamic";

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId, isActive: true },
    select: { id: true, title: true, difficulty: true, description: true, timeLimit: true },
  });

  if (!assessment) notFound();

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/lab/kicad" className="text-sm text-foreground/40 hover:text-foreground/60 mb-8 block">
          &larr; Back to assessments
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">{assessment.title}</h1>
          <span className="text-sm px-2 py-0.5 rounded bg-foreground/10 capitalize">
            {assessment.difficulty}
          </span>
        </div>

        <div className="flex gap-4 text-sm text-foreground/50 mb-8">
          <span>Time limit: {Math.round(assessment.timeLimit / 60)} minutes</span>
        </div>

        <p className="text-foreground/80 leading-relaxed mb-10">
          {assessment.description}
        </p>

        <StartExamButton assessmentId={assessment.id} />
      </div>
    </main>
  );
}
