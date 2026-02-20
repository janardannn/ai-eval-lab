"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface SessionRow {
  id: string;
  user: string;
  assessment: string;
  difficulty: string;
  status: string;
  verdict: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

const verdictColors: Record<string, string> = {
  strong_hire: "text-green-500", hire: "text-green-400", neutral: "text-yellow-400",
  reject: "text-red-400", strong_reject: "text-red-500",
};

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ status: "", verdict: "" });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filters.status) params.set("status", filters.status);
    if (filters.verdict) params.set("verdict", filters.verdict);

    const res = await fetch(`/api/admin/sessions?${params}`);
    const data = await res.json();
    setSessions(data.sessions);
    setTotal(data.total);
    setPages(data.pages);
    setLoading(false);
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Sessions ({total})</h1>

      <div className="flex gap-3 mb-4">
        <select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
          className="p-2 border border-foreground/15 rounded bg-background text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="abandoned">Abandoned</option>
          <option value="queued">Queued</option>
        </select>
        <select value={filters.verdict} onChange={(e) => { setFilters({ ...filters, verdict: e.target.value }); setPage(1); }}
          className="p-2 border border-foreground/15 rounded bg-background text-sm">
          <option value="">All verdicts</option>
          <option value="strong_hire">Strong Hire</option>
          <option value="hire">Hire</option>
          <option value="neutral">Neutral</option>
          <option value="reject">Reject</option>
          <option value="strong_reject">Strong Reject</option>
        </select>
      </div>

      <div className="border border-foreground/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/5">
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Assessment</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Verdict</th>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-foreground/5 hover:bg-foreground/[0.02]">
                <td className="p-3">{s.user}</td>
                <td className="p-3">{s.assessment}</td>
                <td className="p-3 capitalize">{s.status}</td>
                <td className={`p-3 ${verdictColors[s.verdict || ""] || "text-foreground/40"}`}>
                  {s.verdict?.replace(/_/g, " ") || "—"}
                </td>
                <td className="p-3 text-foreground/50">
                  {new Date(s.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3 text-right">
                  <Link href={`/admin/sessions/${s.id}`} className="text-xs text-foreground/40 hover:text-foreground/70">
                    view
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && sessions.length === 0 && (
          <p className="p-6 text-center text-foreground/40">No sessions found.</p>
        )}
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="px-3 py-1 border border-foreground/15 rounded text-sm disabled:opacity-30">Prev</button>
          <span className="px-3 py-1 text-sm text-foreground/50">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)}
            className="px-3 py-1 border border-foreground/15 rounded text-sm disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
}
