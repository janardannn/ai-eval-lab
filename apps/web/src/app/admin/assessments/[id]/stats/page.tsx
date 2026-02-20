"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface AssessmentStats {
  attempts: number;
  completions: number;
  abandoned: number;
  dropoutRate: number;
  avgDuration: number;
  verdictDistribution: Record<string, number>;
  checkpointAverages: Record<string, number>;
  hardestCheckpoint: string;
}

const verdictLabels: Record<string, string> = {
  strong_hire: "Strong Hire", hire: "Hire", neutral: "Neutral",
  reject: "Reject", strong_reject: "Strong Reject",
};

export default function AssessmentStatsPage() {
  const { id } = useParams<{ id: string }>();
  const [stats, setStats] = useState<AssessmentStats | null>(null);

  useEffect(() => {
    fetch(`/api/admin/assessments/${id}/stats`).then((r) => r.json()).then(setStats);
  }, [id]);

  if (!stats) return <div className="text-foreground/40">Loading...</div>;

  return (
    <div className="max-w-3xl">
      <Link href={`/admin/assessments/${id}`} className="text-xs text-foreground/40 hover:text-foreground/60 block mb-4">&larr; Back to assessment</Link>
      <h1 className="text-2xl font-bold mb-6">Assessment Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border border-foreground/10 rounded-lg p-4">
          <p className="text-xs text-foreground/40">Attempts</p>
          <p className="text-2xl font-bold mt-1">{stats.attempts}</p>
        </div>
        <div className="border border-foreground/10 rounded-lg p-4">
          <p className="text-xs text-foreground/40">Completions</p>
          <p className="text-2xl font-bold mt-1">{stats.completions}</p>
        </div>
        <div className="border border-foreground/10 rounded-lg p-4">
          <p className="text-xs text-foreground/40">Dropout Rate</p>
          <p className="text-2xl font-bold mt-1">{stats.dropoutRate}%</p>
        </div>
        <div className="border border-foreground/10 rounded-lg p-4">
          <p className="text-xs text-foreground/40">Avg Duration</p>
          <p className="text-2xl font-bold mt-1">{Math.round(stats.avgDuration / 60)}m</p>
        </div>
      </div>

      {Object.keys(stats.verdictDistribution).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Verdict Distribution</h2>
          <div className="space-y-2">
            {Object.entries(stats.verdictDistribution).map(([v, count]) => (
              <div key={v} className="flex items-center gap-3">
                <span className="text-sm w-28">{verdictLabels[v] || v}</span>
                <div className="flex-1 h-4 bg-foreground/5 rounded overflow-hidden">
                  <div className="h-full bg-foreground/30 rounded" style={{ width: `${(count / stats.attempts) * 100}%` }} />
                </div>
                <span className="text-sm text-foreground/50 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(stats.checkpointAverages).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Checkpoint Averages</h2>
          <div className="space-y-2">
            {Object.entries(stats.checkpointAverages).map(([name, avg]) => (
              <div key={name} className="flex items-center justify-between p-3 border border-foreground/10 rounded">
                <span className="text-sm capitalize">{name.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                    <div className="h-full bg-foreground/50 rounded-full" style={{ width: `${(avg / 10) * 100}%` }} />
                  </div>
                  <span className="text-sm font-mono w-12 text-right">{avg}/10</span>
                </div>
              </div>
            ))}
          </div>
          {stats.hardestCheckpoint && (
            <p className="text-xs text-foreground/40 mt-2">
              Hardest checkpoint: <span className="capitalize">{stats.hardestCheckpoint.replace(/_/g, " ")}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
