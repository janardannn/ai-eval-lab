import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
const difficultyColors: Record<string, string> = {
  easy: "text-green-600",
  medium: "text-yellow-600",
  hard: "text-red-600",
};

export default async function KicadAssessmentsPage() {
  const assessments = await prisma.assessment.findMany({
    where: { isActive: true, environment: "kicad" },
    select: { id: true, title: true, difficulty: true, description: true, timeLimit: true },
    orderBy: { createdAt: "asc" },
  });

  const grouped = assessments.reduce(
    (acc, item) => {
      acc[item.difficulty] = acc[item.difficulty] || [];
      acc[item.difficulty].push(item);
      return acc;
    },
    {} as Record<string, typeof assessments>
  );

  const sections = Object.entries(grouped).sort(
    ([a], [b]) =>
      (difficultyOrder[a as keyof typeof difficultyOrder] ?? 99) -
      (difficultyOrder[b as keyof typeof difficultyOrder] ?? 99)
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-foreground/40 hover:text-foreground/60 mb-8 block">
          &larr; Back
        </Link>
        <h1 className="text-3xl font-bold mb-2">KiCad Assessments</h1>
        <p className="text-foreground/60 mb-10">
          PCB design challenges. Choose an assessment and prove your skills.
        </p>

        {sections.map(([difficulty, items]) => (
          <div key={difficulty} className="mb-10">
            <h2 className={`text-lg font-semibold capitalize mb-4 ${difficultyColors[difficulty] || ""}`}>
              {difficulty}
            </h2>
            <div className="grid gap-3">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/lab/kicad/${item.id}`}
                  className="block p-5 rounded-lg border border-foreground/15 hover:border-foreground/30 hover:bg-foreground/5 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{item.title}</h3>
                      <p className="text-sm text-foreground/50 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    <span className="text-sm text-foreground/40 shrink-0 ml-4">
                      {Math.round(item.timeLimit / 60)} min
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {assessments.length === 0 && (
          <p className="text-foreground/40">No assessments available yet.</p>
        )}
      </div>
    </main>
  );
}
