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
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground/60 mb-1">Evaluating your performance...</p>
          <p className="text-xs text-foreground/30">
            The AI is reviewing your work, Q&A responses, and timeline
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground/60 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-foreground text-background text-sm rounded hover:opacity-90"
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
    <main className="min-h-screen bg-background">
      <div className={`bg-gradient-to-r ${gradient} py-10 sm:py-16`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center text-white">
          <h1 className="text-3xl sm:text-5xl font-bold mb-2">{label}</h1>
          <p className="text-white/80 text-sm sm:text-base">Session complete</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Checkpoint Scores</h2>
          <div className="grid gap-3">
            {Object.entries(report.checkpointScores).map(([name, score]) => (
              <div key={name} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 p-3 rounded border border-foreground/10">
                <span className="text-sm capitalize">{name.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-3">
                  <div className="w-full sm:w-24 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/60 rounded-full"
                      style={{ width: `${(score / 10) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono font-medium text-sm w-10 text-right shrink-0">{score}/10</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Timeline Analysis</h2>
          <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
            {report.timelineAnalysis}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Q&A Evaluation</h2>
          <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
            {report.qaAnalysis}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Overall Report</h2>
          <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
            {report.overallReport}
          </p>
        </section>

        <Link
          href="/"
          className="inline-block mt-4 text-sm text-foreground/50 hover:text-foreground/70"
        >
          &larr; Back to home
        </Link>
      </div>
    </main>
  );
}
