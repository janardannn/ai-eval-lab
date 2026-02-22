import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { difficultyColors } from "@/lib/constants";
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
    <main className="py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/lab/kicad"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to assessments
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {assessment.title}
          </h1>
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ring-1 capitalize ${difficultyColors[assessment.difficulty] || ""}`}
          >
            {assessment.difficulty}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-10">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {Math.round(assessment.timeLimit / 60)} minutes
          </div>
          <span className="text-border">|</span>
          <span>KiCad Environment</span>
        </div>

        <div className="p-6 rounded-lg ring-1 ring-border bg-card shadow-lg shadow-black/[0.03] dark:shadow-black/20 mb-10">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {assessment.description}
          </p>
        </div>

        <StartExamButton assessmentId={assessment.id} />
      </div>
    </main>
  );
}
