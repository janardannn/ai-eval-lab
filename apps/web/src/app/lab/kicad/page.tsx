import Link from "next/link";
import { prisma } from "@/lib/db";
import { difficultyColors } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function KicadAssessmentsPage() {
  const assessments = await prisma.assessment.findMany({
    where: { isActive: true, environment: "kicad" },
    select: { id: true, title: true, difficulty: true, description: true, timeLimit: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          KiCad Assessments
        </h1>
        <p className="text-lg text-muted-foreground mb-12">
          PCB design challenges. Choose an assessment and prove your skills.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {assessments.map((item) => (
            <Link
              key={item.id}
              href={`/lab/kicad/${item.id}`}
              className="group block p-6 rounded-lg ring-1 ring-border bg-card shadow-lg shadow-black/[0.03] dark:shadow-black/20 hover:ring-accent/30 hover:shadow-accent/[0.08] transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold group-hover:text-accent transition-colors">
                  {item.title}
                </h3>
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ring-1 capitalize shrink-0 ml-4 ${difficultyColors[item.difficulty] || ""}`}
                >
                  {item.difficulty}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                {item.description}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {Math.round(item.timeLimit / 60)} min
              </div>
            </Link>
          ))}
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
