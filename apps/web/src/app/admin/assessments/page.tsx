"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AssessmentRow {
  id: string;
  title: string;
  difficulty: string;
  environment: string;
  isActive: boolean;
  timeLimit: number;
  attempts: number;
  avgScore: number;
}

const LABS = [
  { slug: "kicad", name: "KiCad" },
  { slug: "freecad", name: "FreeCAD" },
  { slug: "blender", name: "Blender" },
];

const DIFFICULTY_ORDER = ["easy", "medium", "hard"] as const;
const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-green-500 bg-green-500/10",
  medium: "text-yellow-500 bg-yellow-500/10",
  hard: "text-red-500 bg-red-500/10",
};

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLab, setSelectedLab] = useState("kicad");

  useEffect(() => {
    fetch("/api/admin/assessments")
      .then((r) => r.json())
      .then(setAssessments)
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/assessments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setAssessments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: !isActive } : a))
    );
  }

  const filtered = assessments.filter((a) => a.environment === selectedLab);
  const grouped = Object.groupBy(filtered, (a) => a.difficulty);

  if (loading) {
    return <div className="text-foreground/40">Loading...</div>;
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Assessments</h1>
        <Link
          href="/admin/assessments/new"
          className="px-4 py-2 bg-foreground text-background text-sm rounded hover:opacity-90"
        >
          New Assessment
        </Link>
      </div>

      {/* Lab selector */}
      <div className="flex gap-2 mb-8">
        {LABS.map((lab) => {
          const count = assessments.filter((a) => a.environment === lab.slug).length;
          return (
            <button
              key={lab.slug}
              onClick={() => setSelectedLab(lab.slug)}
              className={`px-4 py-2 text-sm rounded border transition-colors ${
                selectedLab === lab.slug
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/10 text-foreground/60 hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {lab.name}
              {count > 0 && (
                <span className={`ml-2 ${selectedLab === lab.slug ? "text-background/60" : "text-foreground/30"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grouped by difficulty */}
      <div className="space-y-8">
        {DIFFICULTY_ORDER.map((level) => {
          const items = grouped[level];
          return (
            <section key={level}>
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${DIFFICULTY_COLORS[level]}`}>
                  {DIFFICULTY_LABELS[level]}
                </span>
                {items && (
                  <span className="text-sm text-foreground/40">
                    {items.length} assessment{items.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {items && items.length > 0 ? (
                <div className="border border-foreground/10 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-foreground/10 bg-foreground/5">
                        <th className="text-left p-3 font-medium">Title</th>
                        <th className="text-right p-3 font-medium">Time</th>
                        <th className="text-right p-3 font-medium">Attempts</th>
                        <th className="text-right p-3 font-medium">Avg Score</th>
                        <th className="text-center p-3 font-medium">Status</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((a) => (
                        <tr key={a.id} className="border-b border-foreground/5 hover:bg-foreground/[0.02]">
                          <td className="p-3">
                            <Link href={`/admin/assessments/${a.id}`} className="hover:underline">
                              {a.title}
                            </Link>
                          </td>
                          <td className="p-3 text-right">{Math.round(a.timeLimit / 60)}m</td>
                          <td className="p-3 text-right">{a.attempts}</td>
                          <td className="p-3 text-right">{a.avgScore || "—"}</td>
                          <td className="p-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded ${a.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                              {a.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/admin/assessments/${a.id}/stats`}
                                className="text-xs px-2.5 py-1 rounded border border-foreground/15 hover:bg-foreground/5 transition-colors"
                              >
                                Stats
                              </Link>
                              <Link
                                href={`/admin/assessments/${a.id}`}
                                className="text-xs px-2.5 py-1 rounded bg-foreground/10 hover:bg-foreground/15 transition-colors"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() => toggleActive(a.id, a.isActive)}
                                className={`text-xs px-2.5 py-1 rounded transition-colors ${
                                  a.isActive
                                    ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                    : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                }`}
                              >
                                {a.isActive ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-foreground/30 py-2">
                  No {DIFFICULTY_LABELS[level].toLowerCase()} assessments
                </p>
              )}
            </section>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-foreground/40 py-12">
          No assessments for {LABS.find((l) => l.slug === selectedLab)?.name || selectedLab} yet.
        </p>
      )}
    </div>
  );
}
