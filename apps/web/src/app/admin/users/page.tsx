"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  isAdmin: boolean;
  sessionCount: number;
  avgScore: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users").then((r) => r.json()).then(setUsers).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-foreground/40">Loading...</div>;

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Users ({users.length})</h1>

      <div className="border border-foreground/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/5">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-center p-3 font-medium">Role</th>
              <th className="text-right p-3 font-medium">Sessions</th>
              <th className="text-right p-3 font-medium">Avg Score</th>
              <th className="text-right p-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-foreground/5 hover:bg-foreground/[0.02]">
                <td className="p-3">
                  <Link href={`/admin/users/${u.id}`} className="hover:underline">{u.name || "—"}</Link>
                </td>
                <td className="p-3 text-foreground/60">{u.email}</td>
                <td className="p-3 text-center">
                  {u.isAdmin && <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">Admin</span>}
                </td>
                <td className="p-3 text-right">{u.sessionCount}</td>
                <td className="p-3 text-right">{u.avgScore || "—"}</td>
                <td className="p-3 text-right text-foreground/50">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="p-6 text-center text-foreground/40">No users yet.</p>
        )}
      </div>
    </div>
  );
}
