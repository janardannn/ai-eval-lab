"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface UserDetail {
  id: string;
  name: string | null;
  email: string | null;
  isAdmin: boolean;
  createdAt: string;
  sessions: {
    id: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    createdAt: string;
    assessment: { title: string; difficulty: string };
    grade: { verdict: string; checkpointScores: Record<string, number> } | null;
  }[];
}

const verdictColors: Record<string, string> = {
  strong_hire: "text-green-500", hire: "text-green-400", neutral: "text-yellow-400",
  reject: "text-red-400", strong_reject: "text-red-500",
};

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`).then((r) => r.json()).then(setUser);
  }, [id]);

  if (!user) return <div className="text-foreground/40">Loading...</div>;

  return (
    <div className="max-w-4xl">
      <Link href="/admin/users" className="text-xs text-foreground/40 hover:text-foreground/60 block mb-4">&larr; Back to users</Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{user.name || "Unknown"}</h1>
        <p className="text-sm text-foreground/50">{user.email}</p>
        <div className="flex gap-2 mt-2">
          {user.isAdmin && <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">Admin</span>}
          <span className="text-xs text-foreground/40">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Sessions ({user.sessions.length})</h2>
      <div className="border border-foreground/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/5">
              <th className="text-left p-3 font-medium">Assessment</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Verdict</th>
              <th className="text-right p-3 font-medium">Date</th>
              <th className="text-right p-3 font-medium">View</th>
            </tr>
          </thead>
          <tbody>
            {user.sessions.map((s) => (
              <tr key={s.id} className="border-b border-foreground/5">
                <td className="p-3">{s.assessment.title}</td>
                <td className="p-3 capitalize">{s.status}</td>
                <td className={`p-3 capitalize ${verdictColors[s.grade?.verdict || ""] || "text-foreground/40"}`}>
                  {s.grade?.verdict?.replace(/_/g, " ") || "—"}
                </td>
                <td className="p-3 text-right text-foreground/50">{new Date(s.createdAt).toLocaleDateString()}</td>
                <td className="p-3 text-right">
                  <Link href={`/admin/sessions/${s.id}`} className="text-xs text-foreground/40 hover:text-foreground/70">view</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {user.sessions.length === 0 && (
          <p className="p-6 text-center text-foreground/40">No sessions yet.</p>
        )}
      </div>
    </div>
  );
}
