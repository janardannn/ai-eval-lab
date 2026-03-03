import Link from "next/link";
import { prisma } from "@/lib/db";
import { difficultyColors } from "@/lib/constants";
import { getTotalTime } from "@/lib/assessment-time";

export const dynamic = "force-dynamic";

const DIFFICULTY_ORDER = ["easy", "medium", "hard"] as const;
const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const LAB_NAMES: Record<string, string> = {
  kicad: "KiCad",
  freecad: "FreeCAD",
  blender: "Blender",
};

export default async function LabAssessmentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const labName = LAB_NAMES[slug] || slug;

  const assessments = await prisma.assessment.findMany({
    where: { isActive: true, environment: slug },
    select: { id: true, title: true, difficulty: true, description: true, timeLimit: true, introConfig: true, domainConfig: true },
    orderBy: { createdAt: "asc" },
  });

  const grouped = Object.groupBy(assessments, (a) => a.difficulty);

  return (
    <main className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/labs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          {labName} Assessments
        </h1>
        <p className="text-lg text-muted-foreground mb-12">
          Choose an assessment and prove your skills.
        </p>

        <div className="space-y-10">
          {DIFFICULTY_ORDER.map((level) => {
            const items = grouped[level];
            return (
              <section key={level}>
                <div className="flex items-center gap-3 mb-5">
                  <span className={`text-sm font-semibold px-4 py-1.5 rounded-full ring-1 capitalize ${difficultyColors[level]}`}>
                    {DIFFICULTY_LABELS[level]}
                  </span>
                  {items && (
                    <span className="text-sm text-muted-foreground">{items.length} assessment{items.length !== 1 ? "s" : ""}</span>
                  )}
                </div>

                {items && items.length > 0 ? (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <Link
                        key={item.id}
                        href={`/lab/${slug}/${item.id}`}
                        className="group block p-5 rounded-lg ring-1 ring-border bg-card shadow-sm hover:ring-accent/30 hover:shadow-accent/[0.08] transition-all duration-200"
                      >
                        <h3 className="text-base font-semibold group-hover:text-accent transition-colors mb-2">
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {Math.round(getTotalTime(item) / 60)} min
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/50 py-4">
                    No assessments available in {DIFFICULTY_LABELS[level].toLowerCase()}
                  </p>
                )}
              </section>
            );
          })}
        </div>

        {assessments.length === 0 && (
          <p className="text-muted-foreground text-center py-20">
            No assessments available yet.
          </p>
        )}
      </div>
    </main>
  );
}
