"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface GradeReport {
  verdict: string;
  checkpointScores: Record<string, number>;
  timelineAnalysis: string;
  qaAnalysis: string;
  overallReport: string;
}

const verdictColors: Record<string, string> = {
  strong_hire: "from-green-500 to-green-700",
  hire: "from-green-400 to-green-600",
  neutral: "from-yellow-400 to-yellow-600",
  reject: "from-red-400 to-red-600",
  strong_reject: "from-red-500 to-red-700",
};

const verdictLabels: Record<string, string> = {
  strong_hire: "Strong Hire",
  hire: "Hire",
  neutral: "Neutral",
  reject: "Reject",
  strong_reject: "Strong Reject",
};

export default function VerdictPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<GradeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const attempts = useRef(0);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`/api/grader/${sessionId}/report`);
        if (res.ok) {
          setReport(await res.json());
          setLoading(false);
          return;
        }

        attempts.current++;
        if (attempts.current > 40) {
          setError("Grading is taking longer than expected. Please try refreshing later.");
          setLoading(false);
          return;
        }

        setTimeout(poll, 3000);
      } catch {
        attempts.current++;
        if (attempts.current > 40) {
          setError("Failed to connect to the server.");
          setLoading(false);
          return;
        }
        setTimeout(poll, 3000);
      }
    }
    poll();
  }, [sessionId]);

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
            <div className="absolute inset-3 rounded-full ring-2 ring-accent/50 animate-glow-pulse" />
            <div className="absolute inset-7 rounded-full bg-accent" />
          </div>
          <p className="text-lg font-medium mb-2">Evaluating your performance...</p>
          <p className="text-sm text-muted-foreground">
            The AI is reviewing your work, Q&A responses, and timeline
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="h-11 px-6 text-sm font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent-hover shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-150 active:scale-[0.98]"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!report) return null;

  const gradient = verdictColors[report.verdict] || "from-gray-400 to-gray-600";
  const label = verdictLabels[report.verdict] || report.verdict;

  return (
    <main>
      <div className="relative overflow-hidden py-16 sm:py-24">
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-6xl font-bold mb-4 text-white tracking-tight">
            {label}
          </h1>
          <p className="text-white/70 text-base sm:text-lg">Session complete</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-6">
            Checkpoint Scores
          </h2>
          <div className="grid gap-4">
            {Object.entries(report.checkpointScores).map(([name, score]) => (
              <div
                key={name}
                className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 p-5 rounded-lg ring-1 ring-border bg-card shadow-lg shadow-black/[0.03] dark:shadow-black/20"
              >
                <span className="font-medium capitalize">
                  {name.replace(/_/g, " ")}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-full sm:w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-700"
                      style={{ width: `${(score / 10) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold text-sm w-12 text-right shrink-0">
                    {score}/10
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 rounded-lg ring-1 ring-border bg-card shadow-lg shadow-black/[0.03] dark:shadow-black/20">
          <h2 className="text-lg font-semibold mb-4">Timeline Analysis</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {report.timelineAnalysis}
          </p>
        </section>

        <section className="p-6 rounded-lg ring-1 ring-border bg-card shadow-lg shadow-black/[0.03] dark:shadow-black/20">
          <h2 className="text-lg font-semibold mb-4">Q&A Evaluation</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {report.qaAnalysis}
          </p>
        </section>

        <section className="p-6 rounded-lg ring-1 ring-border bg-card shadow-lg shadow-black/[0.03] dark:shadow-black/20">
          <h2 className="text-lg font-semibold mb-4">Overall Report</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {report.overallReport}
          </p>
        </section>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>
      </div>
    </main>
  );
}
