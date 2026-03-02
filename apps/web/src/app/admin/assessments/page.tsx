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

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);

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

      <div className="border border-foreground/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/5">
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium">Difficulty</th>
              <th className="text-left p-3 font-medium">Env</th>
              <th className="text-right p-3 font-medium">Time</th>
              <th className="text-right p-3 font-medium">Attempts</th>
              <th className="text-right p-3 font-medium">Avg Score</th>
              <th className="text-center p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((a) => (
              <tr key={a.id} className="border-b border-foreground/5 hover:bg-foreground/[0.02]">
                <td className="p-3">
                  <Link href={`/admin/assessments/${a.id}`} className="hover:underline">
                    {a.title}
                  </Link>
                </td>
                <td className="p-3 capitalize">{a.difficulty}</td>
                <td className="p-3">{a.environment}</td>
                <td className="p-3 text-right">{Math.round(a.timeLimit / 60)}m</td>
                <td className="p-3 text-right">{a.attempts}</td>
                <td className="p-3 text-right">{a.avgScore || "—"}</td>
                <td className="p-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded ${a.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                    {a.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 text-right space-x-2">
                  <Link href={`/admin/assessments/${a.id}/stats`} className="text-xs text-foreground/40 hover:text-foreground/70">
                    stats
                  </Link>
                  <button
                    onClick={() => toggleActive(a.id, a.isActive)}
                    className="text-xs text-foreground/40 hover:text-foreground/70"
                  >
                    {a.isActive ? "deactivate" : "activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {assessments.length === 0 && (
          <p className="p-6 text-center text-foreground/40">No assessments yet.</p>
        )}
      </div>
    </div>
  );
}
