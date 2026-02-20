"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface SessionDetail {
  id: string;
  status: string;
  adminOverride: string | null;
  adminNotes: string | null;
  startedAt: string | null;
  endedAt: string | null;
  user: { id: string; name: string; email: string };
  assessment: { id: string; title: string; difficulty: string };
  snapshots: { id: string; timestamp: number; data: unknown }[];
  qaPairs: { id: string; phase: string; question: string; answer: string; eval: unknown; timestamp: number }[];
  grade: { verdict: string; checkpointScores: Record<string, number>; timelineAnalysis: string; qaAnalysis: string; overallReport: string } | null;
}

const VERDICTS = ["strong_hire", "hire", "neutral", "reject", "strong_reject"];

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SessionDetail | null>(null);
  const [regrading, setRegrading] = useState(false);
  const [overrideVerdict, setOverrideVerdict] = useState("");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/sessions/${id}`).then((r) => r.json()).then(setData);
  }, [id]);

  async function handleRegrade() {
    setRegrading(true);
    await fetch(`/api/admin/sessions/${id}/regrade`, { method: "POST" });
    const res = await fetch(`/api/admin/sessions/${id}`);
    setData(await res.json());
    setRegrading(false);
  }

  async function handleOverride() {
    if (!overrideVerdict) return;
    setSaving(true);
    await fetch(`/api/admin/sessions/${id}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdict: overrideVerdict, notes: overrideNotes }),
    });
    const res = await fetch(`/api/admin/sessions/${id}`);
    setData(await res.json());
    setSaving(false);
    setOverrideVerdict("");
    setOverrideNotes("");
  }

  if (!data) return <div className="text-foreground/40">Loading...</div>;

  return (
    <div className="max-w-4xl">
      <Link href="/admin/sessions" className="text-xs text-foreground/40 hover:text-foreground/60 block mb-4">&larr; Back to sessions</Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Session Detail</h1>
          <p className="text-sm text-foreground/50 mt-1">
            {data.user.name || data.user.email} &middot; {data.assessment.title} &middot;
            <span className="capitalize"> {data.status}</span>
          </p>
        </div>
        <button onClick={handleRegrade} disabled={regrading}
          className="px-3 py-1.5 border border-foreground/15 text-sm rounded hover:bg-foreground/5 disabled:opacity-50">
          {regrading ? "Regrading..." : "Regrade"}
        </button>
      </div>

      {data.adminOverride && (
        <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded">
          <p className="text-sm font-medium text-amber-400">Admin Override: {data.adminOverride.replace(/_/g, " ")}</p>
          {data.adminNotes && <p className="text-sm text-amber-300/70 mt-1">{data.adminNotes}</p>}
        </div>
      )}

      {/* Grade */}
      {data.grade && (
        <div className="mb-8 border border-foreground/10 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Grade: <span className="capitalize">{data.grade.verdict.replace(/_/g, " ")}</span></h2>
          <div className="grid gap-2 mb-4">
            {Object.entries(data.grade.checkpointScores).map(([name, score]) => (
              <div key={name} className="flex justify-between text-sm">
                <span className="capitalize text-foreground/70">{name.replace(/_/g, " ")}</span>
                <span className="font-mono">{score}/10</span>
              </div>
            ))}
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-foreground/50 hover:text-foreground/70">Full Report</summary>
            <div className="mt-3 space-y-4 text-foreground/60">
              <div><h4 className="font-semibold text-foreground/80 mb-1">Timeline</h4><p className="whitespace-pre-wrap">{data.grade.timelineAnalysis}</p></div>
              <div><h4 className="font-semibold text-foreground/80 mb-1">Q&A</h4><p className="whitespace-pre-wrap">{data.grade.qaAnalysis}</p></div>
              <div><h4 className="font-semibold text-foreground/80 mb-1">Overall</h4><p className="whitespace-pre-wrap">{data.grade.overallReport}</p></div>
            </div>
          </details>
        </div>
      )}

      {/* Q&A Pairs */}
      {data.qaPairs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Q&A ({data.qaPairs.length})</h2>
          <div className="space-y-3">
            {data.qaPairs.map((qa) => (
              <div key={qa.id} className="border border-foreground/10 rounded p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-foreground/5 capitalize">{qa.phase}</span>
                  <span className="text-xs text-foreground/30">{new Date(qa.timestamp * 1000).toLocaleTimeString()}</span>
                </div>
                <p className="font-medium">{qa.question}</p>
                <p className="text-foreground/60 mt-1">{qa.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshots summary */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Snapshots ({data.snapshots.length})</h2>
        {data.snapshots.length > 0 ? (
          <div className="text-sm text-foreground/50">
            <p>First: {new Date(data.snapshots[0].timestamp * 1000).toLocaleTimeString()}</p>
            <p>Last: {new Date(data.snapshots[data.snapshots.length - 1].timestamp * 1000).toLocaleTimeString()}</p>
            <p>Duration: {Math.round((data.snapshots[data.snapshots.length - 1].timestamp - data.snapshots[0].timestamp) / 60)} min</p>
          </div>
        ) : (
          <p className="text-sm text-foreground/40">No snapshots recorded.</p>
        )}
      </div>

      {/* Override */}
      <div className="border border-foreground/10 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Manual Override</h2>
        <div className="flex gap-3">
          <select value={overrideVerdict} onChange={(e) => setOverrideVerdict(e.target.value)}
            className="p-2 border border-foreground/15 rounded bg-background text-sm">
            <option value="">Select verdict</option>
            {VERDICTS.map((v) => <option key={v} value={v}>{v.replace(/_/g, " ")}</option>)}
          </select>
          <input value={overrideNotes} onChange={(e) => setOverrideNotes(e.target.value)}
            placeholder="Admin notes (optional)"
            className="flex-1 p-2 border border-foreground/15 rounded bg-background text-sm" />
          <button onClick={handleOverride} disabled={!overrideVerdict || saving}
            className="px-4 py-2 bg-foreground text-background text-sm rounded hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving..." : "Override"}
          </button>
        </div>
      </div>
    </div>
  );
}
