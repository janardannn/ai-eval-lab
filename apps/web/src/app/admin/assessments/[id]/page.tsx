"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Assessment {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  environment: string;
  timeLimit: number;
  introConfig: { questions: string[]; adaptive: boolean; maxQuestions: number };
  domainConfig: { questions: string[]; adaptive: boolean; maxQuestions: number; adaptivePrompt?: string };
  labConfig: { problemStatement: string; rubric: { checkpoints: { name: string; description: string; weight: number; expectedOrder: number }[] } };
  isActive: boolean;
}

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Assessment | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Assessment>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/assessments/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setForm(d); });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/admin/assessments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        difficulty: form.difficulty,
        description: form.description,
        timeLimit: form.timeLimit,
      }),
    });
    const res = await fetch(`/api/admin/assessments/${id}`);
    setData(await res.json());
    setEditing(false);
    setSaving(false);
  }

  if (!data) return <div className="text-foreground/40">Loading...</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/assessments" className="text-xs text-foreground/40 hover:text-foreground/60 block mb-2">&larr; Back</Link>
          <h1 className="text-2xl font-bold">{data.title}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/assessments/${id}/stats`} className="px-3 py-1.5 border border-foreground/15 text-sm rounded hover:bg-foreground/5">Stats</Link>
          <button onClick={() => setEditing(!editing)} className="px-3 py-1.5 border border-foreground/15 text-sm rounded hover:bg-foreground/5">
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-4">
          <input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full p-2 border border-foreground/15 rounded bg-background text-sm" />
          <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4} className="w-full p-2 border border-foreground/15 rounded bg-background text-sm resize-none" />
          <div className="grid grid-cols-2 gap-4">
            <select value={form.difficulty || ""} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              className="p-2 border border-foreground/15 rounded bg-background text-sm">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <input type="number" value={form.timeLimit ? Math.round(form.timeLimit / 60) : ""}
              onChange={(e) => setForm({ ...form, timeLimit: Number(e.target.value) * 60 })}
              placeholder="Time (min)"
              className="p-2 border border-foreground/15 rounded bg-background text-sm" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-foreground text-background text-sm rounded hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      ) : (
        <div className="space-y-6 text-sm">
          <div className="flex gap-3">
            <span className={`px-2 py-0.5 rounded text-xs ${data.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
              {data.isActive ? "Active" : "Inactive"}
            </span>
            <span className="text-foreground/50 capitalize">{data.difficulty}</span>
            <span className="text-foreground/50">{data.environment}</span>
            <span className="text-foreground/50">{Math.round(data.timeLimit / 60)} min</span>
          </div>
          <p className="text-foreground/70 leading-relaxed">{data.description}</p>

          <div className="border border-foreground/10 rounded p-4">
            <h3 className="font-semibold mb-2">Intro Config</h3>
            <p className="text-foreground/50 mb-2">{data.introConfig.questions.length} questions, {data.introConfig.adaptive ? "adaptive" : "static"}</p>
            {data.introConfig.questions.map((q, i) => <p key={i} className="text-foreground/60 ml-2">{i + 1}. {q}</p>)}
          </div>

          <div className="border border-foreground/10 rounded p-4">
            <h3 className="font-semibold mb-2">Domain Config</h3>
            <p className="text-foreground/50 mb-2">{data.domainConfig.questions.length} questions, {data.domainConfig.adaptive ? "adaptive" : "static"}</p>
            {data.domainConfig.questions.map((q, i) => <p key={i} className="text-foreground/60 ml-2">{i + 1}. {q}</p>)}
          </div>

          <div className="border border-foreground/10 rounded p-4">
            <h3 className="font-semibold mb-2">Lab Config</h3>
            <p className="text-foreground/60 mb-3">{data.labConfig.problemStatement}</p>
            <h4 className="text-xs font-semibold text-foreground/40 uppercase mb-2">Checkpoints</h4>
            {data.labConfig.rubric.checkpoints.map((c, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-foreground/5 last:border-0">
                <div>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-foreground/40 ml-2">{c.description}</span>
                </div>
                <span className="text-foreground/50">{c.weight}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
