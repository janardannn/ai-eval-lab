"use client";

import { useEffect, useState } from "react";

interface DashboardData {
  totalAssessments: number;
  totalSessions: number;
  totalCompleted: number;
  totalInProgress: number;
  totalAbandoned: number;
  avgSessionDuration: number;
  verdictDistribution: Record<string, number>;
  completionsPerDay: { date: string; count: number }[];
  topAssessmentsByAttempts: { id: string; title: string; attempts: number }[];
}

const verdictLabels: Record<string, string> = {
  strong_hire: "Strong Hire",
  hire: "Hire",
  neutral: "Neutral",
  reject: "Reject",
  strong_reject: "Strong Reject",
};

const verdictColors: Record<string, string> = {
  strong_hire: "bg-green-500",
  hire: "bg-green-400",
  neutral: "bg-yellow-400",
  reject: "bg-red-400",
  strong_reject: "bg-red-500",
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "unauthorized");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-foreground/40">
        <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground/60 rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  const totalVerdicts = Object.values(data.verdictDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Assessments", value: data.totalAssessments },
          { label: "Total Sessions", value: data.totalSessions },
          { label: "Completed", value: data.totalCompleted },
          { label: "In Progress", value: data.totalInProgress },
          { label: "Abandoned", value: data.totalAbandoned },
          { label: "Avg Duration", value: `${Math.round(data.avgSessionDuration / 60)}m` },
        ].map((stat) => (
          <div key={stat.label} className="border border-foreground/10 rounded-lg p-4">
            <p className="text-xs text-foreground/40">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {totalVerdicts > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Verdict Distribution</h2>
          <div className="flex gap-1 h-8 rounded overflow-hidden">
            {Object.entries(data.verdictDistribution).map(([verdict, count]) => (
              <div
                key={verdict}
                className={`${verdictColors[verdict] || "bg-gray-400"} relative group`}
                style={{ width: `${(count / totalVerdicts) * 100}%` }}
                title={`${verdictLabels[verdict] || verdict}: ${count}`}
              >
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {count}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2">
            {Object.entries(data.verdictDistribution).map(([verdict, count]) => (
              <span key={verdict} className="text-xs text-foreground/50">
                {verdictLabels[verdict] || verdict}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.topAssessmentsByAttempts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Top Assessments</h2>
          <div className="space-y-2">
            {data.topAssessmentsByAttempts.map((a) => (
              <div key={a.id} className="flex justify-between items-center p-3 border border-foreground/10 rounded">
                <span className="text-sm">{a.title}</span>
                <span className="text-sm text-foreground/50">{a.attempts} attempts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.completionsPerDay.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Completions (Last 30 Days)</h2>
          <div className="flex items-end gap-1 h-24">
            {data.completionsPerDay.map((d) => {
              const max = Math.max(...data.completionsPerDay.map((x) => x.count));
              const height = max > 0 ? (d.count / max) * 100 : 0;
              return (
                <div
                  key={d.date}
                  className="flex-1 bg-foreground/20 rounded-t hover:bg-foreground/30 transition-colors"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${d.date}: ${d.count}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
