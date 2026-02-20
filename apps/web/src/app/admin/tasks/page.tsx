"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  timeLimit: number;
  rubric?: unknown;
}

const EMPTY_TASK = {
  title: "",
  difficulty: "easy",
  description: "",
  timeLimit: 1800,
  rubric: "",
};

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState(EMPTY_TASK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function handleSave() {
    setError(null);
    setSaving(true);

    let rubric;
    try {
      rubric = JSON.parse(form.rubric);
    } catch {
      setError("Rubric must be valid JSON");
      setSaving(false);
      return;
    }

    const payload = { ...form, rubric };
    const url = editingId ? `/api/tasks/${editingId}` : "/api/tasks";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }

    setForm(EMPTY_TASK);
    setEditingId(null);
    await loadTasks();
    setSaving(false);
  }

  function handleEdit(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      difficulty: task.difficulty,
      description: task.description,
      timeLimit: task.timeLimit,
      rubric: JSON.stringify(task.rubric, null, 2),
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    await loadTasks();
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-sm text-foreground/40 hover:text-foreground/60 mb-2 block">
              &larr; Back
            </Link>
            <h1 className="text-2xl font-bold">Task Management</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="border border-foreground/15 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Edit Task" : "New Task"}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm text-foreground/60 block mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-2 border border-foreground/15 rounded bg-background text-sm focus:outline-none focus:border-foreground/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-foreground/60 block mb-1">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full p-2 border border-foreground/15 rounded bg-background text-sm focus:outline-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-foreground/60 block mb-1">Time Limit (min)</label>
                  <input
                    type="number"
                    value={Math.round(form.timeLimit / 60)}
                    onChange={(e) => setForm({ ...form, timeLimit: Number(e.target.value) * 60 })}
                    className="w-full p-2 border border-foreground/15 rounded bg-background text-sm focus:outline-none focus:border-foreground/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-foreground/60 block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full p-2 border border-foreground/15 rounded bg-background text-sm resize-none focus:outline-none focus:border-foreground/30"
                />
              </div>

              <div>
                <label className="text-sm text-foreground/60 block mb-1">Rubric (JSON)</label>
                <textarea
                  value={form.rubric}
                  onChange={(e) => setForm({ ...form, rubric: e.target.value })}
                  rows={8}
                  className="w-full p-2 border border-foreground/15 rounded bg-background text-sm font-mono resize-none focus:outline-none focus:border-foreground/30"
                  placeholder={'{\n  "checkpoints": [\n    { "name": "...", "weight": 0.2, "description": "..." }\n  ]\n}'}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title || !form.description || !form.rubric}
                  className="px-4 py-2 bg-foreground text-background text-sm rounded hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
                {editingId && (
                  <button
                    onClick={() => { setEditingId(null); setForm(EMPTY_TASK); }}
                    className="px-4 py-2 border border-foreground/15 text-sm rounded hover:bg-foreground/5"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Task list */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Existing Tasks ({tasks.length})</h2>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-foreground/15 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{task.title}</h3>
                      <p className="text-xs text-foreground/40 mt-0.5">
                        {task.difficulty} &middot; {Math.round(task.timeLimit / 60)} min
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(task)}
                        className="text-xs text-foreground/40 hover:text-foreground/70"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="text-xs text-red-500/60 hover:text-red-500"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/50 mt-2 line-clamp-2">
                    {task.description}
                  </p>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-sm text-foreground/40">No tasks created yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
