"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SessionEntry {
  id: string;
  assessment: string;
  difficulty: string;
  environment: string;
  timeLimit: number;
  status: string;
  verdict: string | null;
  checkpointScores: Record<string, number> | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

const verdictLabels: Record<string, string> = {
  strong_hire: "Strong Hire",
  hire: "Hire",
  neutral: "Neutral",
  reject: "Reject",
  strong_reject: "Strong Reject",
};

const verdictStyles: Record<string, string> = {
  strong_hire: "text-green-400 bg-green-400/10 ring-green-400/20",
  hire: "text-green-400 bg-green-400/10 ring-green-400/20",
  neutral: "text-yellow-400 bg-yellow-400/10 ring-yellow-400/20",
  reject: "text-red-400 bg-red-400/10 ring-red-400/20",
  strong_reject: "text-red-500 bg-red-500/10 ring-red-500/20",
};

const statusStyles: Record<string, string> = {
  completed: "text-green-400 bg-green-400/10 ring-green-400/20",
  active: "text-blue-400 bg-blue-400/10 ring-blue-400/20",
  queued: "text-yellow-400 bg-yellow-400/10 ring-yellow-400/20",
  abandoned: "text-muted-foreground bg-muted ring-border",
};

const difficultyStyles: Record<string, string> = {
  easy: "text-green-400",
  medium: "text-yellow-400",
  hard: "text-red-400",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(startedAt: string | null, endedAt: string | null) {
  if (!startedAt || !endedAt) return null;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "<1 min";
  return `${mins} min`;
}

export default function MySessionsPage() {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/my-sessions")
      .then((r) => r.json())
      .then((data) => {
        setSessions(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight mb-8">My Sessions</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-lg bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-8">My Sessions</h1>

      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-muted-foreground mb-2">No sessions yet</p>
          <p className="text-sm text-muted-foreground/70 mb-6">
            Start an assessment to see your history here.
          </p>
          <Link
            href="/lab/kicad"
            className="inline-flex h-10 px-5 items-center text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-colors active:scale-[0.98]"
          >
            Browse assessments
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}
    </main>
  );
}

function SessionCard({ session: s }: { session: SessionEntry }) {
  const duration = formatDuration(s.startedAt, s.endedAt);
  const hasVerdict = s.status === "completed" && s.verdict;
  const avgScore =
    s.checkpointScores
      ? Math.round(
          (Object.values(s.checkpointScores).reduce((a, b) => a + b, 0) /
            Object.values(s.checkpointScores).length) *
            10
        ) / 10
      : null;

  return (
    <Link
      href={
        hasVerdict
          ? `/session/${s.id}/verdict`
          : s.status === "active"
            ? `/session/${s.id}`
            : "#"
      }
      className={`block rounded-lg ring-1 ring-border bg-card p-5 transition-all duration-150 ${
        hasVerdict || s.status === "active"
          ? "hover:ring-accent/40 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          : "opacity-70 cursor-default"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: assessment info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-base">{s.assessment}</h3>
            <span
              className={`text-xs font-medium capitalize ${difficultyStyles[s.difficulty] || "text-muted-foreground"}`}
            >
              {s.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatDate(s.createdAt)}</span>
            {duration && (
              <>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {duration}
                </span>
              </>
            )}
            {avgScore !== null && (
              <>
                <span className="text-border">|</span>
                <span>Avg: {avgScore}/10</span>
              </>
            )}
          </div>
        </div>

        {/* Right: status / verdict */}
        <div className="flex items-center gap-2">
          {hasVerdict ? (
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-md ring-1 ${verdictStyles[s.verdict!] || "text-muted-foreground ring-border"}`}
            >
              {verdictLabels[s.verdict!] || s.verdict}
            </span>
          ) : (
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-md ring-1 capitalize ${statusStyles[s.status] || "text-muted-foreground ring-border"}`}
            >
              {s.status}
            </span>
          )}
          {(hasVerdict || s.status === "active") && (
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </div>
      </div>
    </Link>
  );
}
