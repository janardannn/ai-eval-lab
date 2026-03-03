"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Checkpoint {
  name: string;
  description: string;
  weight: number;
}

interface QuestionItem {
  text: string;
  followUps?: string[];
}

interface PhaseConfig {
  questions: QuestionItem[];
}

interface LabConfig {
  problemStatement: string;
  probeQuestions?: string[];
  rubric: { strictOrder?: boolean; checkpoints: Checkpoint[] };
}

interface Assessment {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  environment: string;
  timeLimit: number;
  introConfig: PhaseConfig;
  domainConfig: PhaseConfig;
  labConfig: LabConfig;
  referenceFile: boolean;
  isActive: boolean;
}

interface FollowUpDraft {
  text: string;
  timeLimit: number;
  sameAsParent: boolean;
}

interface QuestionDraft {
  text: string;
  timeLimit: number;
  followUps: FollowUpDraft[];
}

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Assessment | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ttsProgress, setTtsProgress] = useState<{ total: number; completed: number; toGenerate: number; done?: boolean; generated?: number; failed?: number; error?: string } | null>(null);

  // Edit form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [timeLimit, setTimeLimit] = useState(30);

  const [introQuestions, setIntroQuestions] = useState<QuestionDraft[]>([]);
  const [domainQuestions, setDomainQuestions] = useState<QuestionDraft[]>([]);

  const [problemStatement, setProblemStatement] = useState("");
  const [strictOrder, setStrictOrder] = useState(false);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [probeQuestions, setProbeQuestions] = useState<string[]>([]);
  const [generatingProbes, setGeneratingProbes] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/assessments/${id}`)
      .then((r) => r.json())
      .then((d: Assessment) => {
        setData(d);
        populateForm(d);
      });
  }, [id]);

  function toDrafts(items: QuestionItem[]): QuestionDraft[] {
    return items.map((q) => {
      const tlSec = (q as { timeLimit?: number }).timeLimit || 0;
      return {
        text: typeof q === "string" ? q : q.text,
        timeLimit: tlSec > 0 ? Math.round(tlSec / 60) : 0,
        followUps: (q.followUps || []).map((f: string | { text: string; timeLimit?: number }) => {
          if (typeof f === "string") return { text: f, timeLimit: 0, sameAsParent: true };
          const fSec = f.timeLimit || 0;
          return { text: f.text, timeLimit: fSec > 0 ? Math.round(fSec / 60) : 0, sameAsParent: !f.timeLimit };
        }),
      };
    });
  }

  function populateForm(a: Assessment) {
    setTitle(a.title);
    setDescription(a.description);
    setDifficulty(a.difficulty);
    setTimeLimit(Math.round(a.timeLimit / 60));
    setIntroQuestions(toDrafts(a.introConfig.questions));
    setDomainQuestions(toDrafts(a.domainConfig.questions));
    setProblemStatement(a.labConfig.problemStatement);
    setStrictOrder(a.labConfig.rubric.strictOrder ?? false);
    setCheckpoints(a.labConfig.rubric.checkpoints.map(({ name, description, weight }) => ({ name, description, weight })));
    setProbeQuestions(a.labConfig.probeQuestions ?? []);
  }

  function startEditing() { if (data) populateForm(data); setEditing(true); }
  function cancelEditing() { if (data) populateForm(data); setEditing(false); }

  function totalWeight() { return checkpoints.reduce((s, c) => s + c.weight, 0); }

  function filterQuestions(list: QuestionDraft[]) {
    return list
      .filter((q) => q.text.trim())
      .map((q) => {
        const validFollowUps = q.followUps.filter((f) => f.text.trim());
        return {
          text: q.text.trim(),
          timeLimit: q.timeLimit * 60,
          ...(validFollowUps.length > 0
            ? {
                followUps: validFollowUps.map((f) => ({
                  text: f.text.trim(),
                  ...(!f.sameAsParent && f.timeLimit > 0 ? { timeLimit: f.timeLimit * 60 } : {}),
                })),
              }
            : {}),
        };
      });
  }

  function validateQuestionTimers(list: QuestionDraft[]): string | null {
    for (let i = 0; i < list.length; i++) {
      const q = list[i];
      if (!q.text.trim()) continue;
      if (q.timeLimit <= 0) return `Question ${i + 1} is missing a time limit`;
      for (let fi = 0; fi < q.followUps.length; fi++) {
        const f = q.followUps[fi];
        if (!f.text.trim()) continue;
        if (!f.sameAsParent && f.timeLimit <= 0) return `Follow-up ${fi + 1} of question ${i + 1} is missing a time limit`;
      }
    }
    return null;
  }

  function updateQuestion(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, i: number, text: string) {
    const next = [...list]; next[i] = { ...next[i], text }; setList(next);
  }

  function updateQuestionTimeLimit(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, i: number, timeLimit: number) {
    const next = [...list]; next[i] = { ...next[i], timeLimit }; setList(next);
  }

  function removeQuestion(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, i: number) {
    setList(list.filter((_, j) => j !== i));
  }

  function addFollowUp(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, i: number) {
    const next = [...list]; next[i] = { ...next[i], followUps: [...next[i].followUps, { text: "", timeLimit: 0, sameAsParent: true }] }; setList(next);
  }

  function updateFollowUp(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, qi: number, fi: number, val: string) {
    const next = [...list]; const fups = [...next[qi].followUps]; fups[fi] = { ...fups[fi], text: val };
    next[qi] = { ...next[qi], followUps: fups }; setList(next);
  }

  function updateFollowUpTimer(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, qi: number, fi: number, timeLimit: number) {
    const next = [...list]; const fups = [...next[qi].followUps]; fups[fi] = { ...fups[fi], timeLimit };
    next[qi] = { ...next[qi], followUps: fups }; setList(next);
  }

  function toggleFollowUpSameAsParent(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, qi: number, fi: number) {
    const next = [...list]; const fups = [...next[qi].followUps]; fups[fi] = { ...fups[fi], sameAsParent: !fups[fi].sameAsParent, timeLimit: 0 };
    next[qi] = { ...next[qi], followUps: fups }; setList(next);
  }

  function removeFollowUp(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, qi: number, fi: number) {
    const next = [...list]; next[qi] = { ...next[qi], followUps: next[qi].followUps.filter((_, j) => j !== fi) }; setList(next);
  }

  async function handleSave() {
    const introTimerErr = validateQuestionTimers(introQuestions);
    if (introTimerErr) { alert(`Intro: ${introTimerErr}`); return; }

    const domainTimerErr = validateQuestionTimers(domainQuestions);
    if (domainTimerErr) { alert(`Domain: ${domainTimerErr}`); return; }

    if (totalWeight() !== 100) { alert("Checkpoint weights must sum to 100"); return; }

    setSaving(true);
    await fetch(`/api/admin/assessments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, description, difficulty,
        timeLimit: timeLimit * 60,
        introConfig: { questions: filterQuestions(introQuestions) },
        domainConfig: { questions: filterQuestions(domainQuestions) },
        labConfig: {
          problemStatement,
          probeQuestions: probeQuestions.filter((q) => q.trim()),
          rubric: { strictOrder, checkpoints: checkpoints.filter((c) => c.name.trim()) },
        },
      }),
    });

    setTtsProgress({ total: 0, completed: 0, toGenerate: 0 });
    setSaving(false);

    try {
      const ttsRes = await fetch(`/api/admin/assessments/${id}/generate-tts`, { method: "POST" });
      if (!ttsRes.ok) {
        const err = await ttsRes.json().catch(() => ({ error: `HTTP ${ttsRes.status}` }));
        setTtsProgress({ total: 0, completed: 0, toGenerate: 0, error: err.error || `Failed (${ttsRes.status})` });
        return;
      }

      const reader = ttsRes.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop()!;
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          if (msg.type === "start") {
            setTtsProgress({ total: msg.total, completed: 0, toGenerate: msg.toGenerate });
          } else if (msg.type === "progress") {
            setTtsProgress((prev) => prev ? { ...prev, completed: msg.completed } : prev);
          } else if (msg.type === "done") {
            setTtsProgress({ total: msg.total, completed: msg.toGenerate || 0, toGenerate: msg.toGenerate || 0, done: true, generated: msg.generated, failed: msg.failed });
          } else if (msg.type === "error") {
            setTtsProgress((prev) => ({ total: prev?.total || 0, completed: 0, toGenerate: 0, error: msg.error }));
          }
        }
      }

      await new Promise((r) => setTimeout(r, 2500));
      setTtsProgress(null);
    } catch {
      setTtsProgress({ total: 0, completed: 0, toGenerate: 0, error: "Failed to connect to TTS service" });
      return;
    }

    const res = await fetch(`/api/admin/assessments/${id}`);
    const updated = await res.json();
    setData(updated);
    setEditing(false);
  }

  async function handleRefUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/admin/assessments/${id}/reference`, { method: "POST", body: formData });
    if (res.ok) setData((prev) => prev ? { ...prev, referenceFile: true } : prev);
    setUploading(false);
  }

  if (!data) return <div className="text-foreground/40">Loading...</div>;

  const inputClass = "w-full p-2 border border-foreground/15 rounded bg-background text-sm";
  const sectionClass = "border border-foreground/10 rounded p-4";

  function renderQuestionEditor(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, label: string) {
    return (
      <div className={sectionClass}>
        <h3 className="font-semibold mb-3">{label}</h3>
        <div className="space-y-3">
          {list.map((q, i) => (
            <div key={i} className="space-y-2">
              <div className="flex gap-2">
                <input value={q.text} onChange={(e) => updateQuestion(list, setList, i, e.target.value)}
                  placeholder={`Question ${i + 1}`} className={`flex-1 ${inputClass}`} />
                <div className="flex items-center gap-1">
                  <input type="number" min={1} value={q.timeLimit || ""} onChange={(e) => updateQuestionTimeLimit(list, setList, i, Number(e.target.value))}
                    placeholder="min" className={`w-16 p-2 border rounded bg-background text-sm text-center ${q.timeLimit > 0 ? "border-foreground/15" : "border-red-500/50"}`} />
                  <span className="text-xs text-foreground/30">m</span>
                </div>
                <button onClick={() => removeQuestion(list, setList, i)}
                  className="text-red-500/60 hover:text-red-500 text-xs px-2">remove</button>
              </div>
              {q.followUps.map((f, fi) => (
                <div key={fi} className="space-y-1 ml-6">
                  <div className="flex gap-2">
                    <span className="text-foreground/30 text-xs mt-2.5">↳</span>
                    <input value={f.text} onChange={(e) => updateFollowUp(list, setList, i, fi, e.target.value)}
                      placeholder={`Follow-up ${fi + 1}`} className={`flex-1 ${inputClass}`} />
                    {!f.sameAsParent && (
                      <div className="flex items-center gap-1">
                        <input type="number" min={1} value={f.timeLimit || ""} onChange={(e) => updateFollowUpTimer(list, setList, i, fi, Number(e.target.value))}
                          placeholder="min" className={`w-16 p-2 border rounded bg-background text-sm text-center ${f.timeLimit > 0 ? "border-foreground/10" : "border-red-500/50"}`} />
                        <span className="text-xs text-foreground/30">m</span>
                      </div>
                    )}
                    <button onClick={() => removeFollowUp(list, setList, i, fi)}
                      className="text-red-500/60 hover:text-red-500 text-xs px-2">x</button>
                  </div>
                  <label className="flex items-center gap-1.5 ml-5 cursor-pointer">
                    <input type="checkbox" checked={f.sameAsParent} onChange={() => toggleFollowUpSameAsParent(list, setList, i, fi)} className="w-3 h-3" />
                    <span className="text-xs text-foreground/30">Same as parent</span>
                  </label>
                </div>
              ))}
              <button onClick={() => addFollowUp(list, setList, i)}
                className="text-xs text-foreground/30 hover:text-foreground/60 ml-6">+ Add follow-up</button>
            </div>
          ))}
          <button onClick={() => setList([...list, { text: "", timeLimit: 2, followUps: [] }])}
            className="text-sm text-foreground/40 hover:text-foreground/70">+ Add question</button>
        </div>
      </div>
    );
  }

  function renderReadonlyQuestions(config: PhaseConfig | undefined | null, label: string) {
    const dotColor = label.toLowerCase().includes("intro") ? "bg-blue-500" : "bg-amber-500";
    if (!config?.questions?.length) {
      return (
        <section>
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            {label}
          </h2>
          <p className="text-foreground/30">No questions configured</p>
        </section>
      );
    }
    const total = config.questions.reduce((s, q) => s + 1 + (q.followUps?.length ?? 0), 0);
    return (
      <section>
        <h2 className="text-base font-bold mb-4 flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          {label}
          <span className="text-xs font-normal text-foreground/30">{total} items</span>
        </h2>
        <div className="space-y-2">
          {config.questions.map((q, i) => {
            const qAny = q as QuestionItem & { timeLimit?: number };
            return (
              <div key={i} className="rounded-lg border border-foreground/10 p-3">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-foreground/30 mt-0.5 w-4 shrink-0 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-foreground/70">{q.text}</p>
                      {qAny.timeLimit ? (
                        <span className="text-xs font-mono text-foreground/30 shrink-0 mt-0.5">{Math.round(qAny.timeLimit / 60)}m</span>
                      ) : null}
                    </div>
                    {q.followUps && q.followUps.length > 0 && (
                      <div className="mt-2 ml-1 space-y-1.5 border-l-2 border-foreground/5 pl-3">
                        {q.followUps.map((f, fi) => {
                          const fText = typeof f === "string" ? f : (f as { text: string; timeLimit?: number }).text;
                          const fTime = typeof f === "string" ? 0 : (f as { timeLimit?: number }).timeLimit || 0;
                          return (
                            <div key={fi} className="flex items-start justify-between gap-2">
                              <p className="text-foreground/45 text-xs">{fText}</p>
                              {fTime ? <span className="text-[10px] font-mono text-foreground/25 shrink-0">{Math.round(fTime / 60)}m</span> : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="max-w-3xl">
      {ttsProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-background ring-1 ring-foreground/10 rounded-lg p-8 max-w-sm w-full text-center space-y-4">
            {ttsProgress.error ? (
              <svg className="w-8 h-8 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : ttsProgress.done ? (
              <svg className="w-8 h-8 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : null}
            <div>
              <p className="text-sm font-medium">
                {ttsProgress.error ? "Audio Generation Failed" : ttsProgress.done ? "Audio Generated" : "Generating Audio"}
              </p>
              <p className="text-xs text-foreground/50 mt-1">
                {ttsProgress.error
                  ? ttsProgress.error
                  : ttsProgress.done
                    ? `${ttsProgress.generated} generated${ttsProgress.failed ? `, ${ttsProgress.failed} failed` : ""}`
                    : ttsProgress.toGenerate > 0
                      ? `${ttsProgress.completed} / ${ttsProgress.toGenerate}`
                      : "Checking existing audio..."}
              </p>
            </div>
            {!ttsProgress.error && !ttsProgress.done && (
              <div className="w-full bg-foreground/10 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-foreground rounded-full transition-all duration-500 ease-out"
                  style={{ width: ttsProgress.toGenerate > 0 ? `${Math.round((ttsProgress.completed / ttsProgress.toGenerate) * 100)}%` : "0%" }}
                />
              </div>
            )}
            {ttsProgress.error && (
              <button
                onClick={() => setTtsProgress(null)}
                className="px-4 py-1.5 text-xs rounded border border-foreground/15 hover:bg-foreground/5 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/assessments" className="text-xs text-foreground/40 hover:text-foreground/60 block mb-2">&larr; Back</Link>
          <h1 className="text-2xl font-bold">{data.title}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/assessments/${id}/stats`} className="px-3 py-1.5 border border-foreground/15 text-sm rounded hover:bg-foreground/5">Stats</Link>
          <button onClick={editing ? cancelEditing : startEditing} className="px-3 py-1.5 border border-foreground/15 text-sm rounded hover:bg-foreground/5">
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-6">
          <div className={sectionClass}>
            <h3 className="font-semibold mb-3">General</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-foreground/50 block mb-1">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-foreground/50 block mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={3} className={`${inputClass} resize-none`} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-foreground/50 block mb-1">Difficulty</label>
                  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputClass}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-foreground/50 block mb-1">Environment</label>
                  <input value={data.environment} disabled className={`${inputClass} opacity-50`} />
                </div>
                <div>
                  <label className="text-xs text-foreground/50 block mb-1">Lab Time (min)</label>
                  <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))}
                    placeholder="Lab only, excl. Q&A" className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {renderQuestionEditor(introQuestions, setIntroQuestions, "Intro Questions")}
          {renderQuestionEditor(domainQuestions, setDomainQuestions, "Domain Questions")}

          {/* Lab */}
          <div className={sectionClass}>
            <h3 className="font-semibold mb-3">Lab Config</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-foreground/50 block mb-1">Problem Statement</label>
                <textarea value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)}
                  rows={3} className={`${inputClass} resize-none`} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-foreground/50">
                    Checkpoints <span className={totalWeight() === 100 ? "text-green-500" : "text-red-400"}>({totalWeight()}/100)</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={strictOrder} onChange={(e) => setStrictOrder(e.target.checked)} />
                      Strict ordering
                    </label>
                    <button onClick={() => setCheckpoints([...checkpoints, { name: "", description: "", weight: 0 }])}
                      className="text-sm text-foreground/40 hover:text-foreground/70">+ Add checkpoint</button>
                  </div>
                </div>
                {strictOrder && (
                  <p className="text-xs text-foreground/40 mb-2">Checkpoints must be completed in the order listed below.</p>
                )}
                <div className="space-y-2">
                  {checkpoints.map((cp, i) => (
                    <div key={i} className="border border-foreground/10 rounded p-2 space-y-2">
                      <div className="flex gap-2 items-center">
                        {strictOrder && <span className="text-xs text-foreground/30 w-5 text-center shrink-0">{i + 1}</span>}
                        <input value={cp.name} placeholder="Checkpoint name"
                          onChange={(e) => { const n = [...checkpoints]; n[i] = { ...cp, name: e.target.value }; setCheckpoints(n); }}
                          className={`flex-1 ${inputClass}`} />
                        <div className="flex items-center gap-1">
                          <input type="number" value={cp.weight} placeholder="Wt"
                            onChange={(e) => { const n = [...checkpoints]; n[i] = { ...cp, weight: Number(e.target.value) }; setCheckpoints(n); }}
                            className="w-16 p-2 border border-foreground/15 rounded bg-background text-sm text-center" />
                          <span className="text-xs text-foreground/30">%</span>
                        </div>
                        <button onClick={() => setCheckpoints(checkpoints.filter((_, j) => j !== i))}
                          className="text-red-500/60 hover:text-red-500 text-xs px-2">x</button>
                      </div>
                      <input value={cp.description} placeholder="What the student should accomplish"
                        onChange={(e) => { const n = [...checkpoints]; n[i] = { ...cp, description: e.target.value }; setCheckpoints(n); }}
                        className={inputClass} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-foreground/10 rounded p-3 bg-foreground/[0.02]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold">Probe Questions</h4>
                    <p className="text-xs text-foreground/40 mt-0.5">Asked every ~2.5 min during the lab to probe reasoning.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        setGeneratingProbes(true);
                        try {
                          const res = await fetch(`/api/admin/assessments/${id}/generate-probes`, { method: "POST" });
                          const data = await res.json();
                          if (data.questions) setProbeQuestions(data.questions);
                        } catch {
                          alert("Failed to generate probe questions");
                        }
                        setGeneratingProbes(false);
                      }}
                      disabled={generatingProbes}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {generatingProbes ? "Generating..." : "Generate with AI"}
                    </button>
                    <button onClick={() => setProbeQuestions([...probeQuestions, ""])}
                      className="px-3 py-1.5 text-xs font-medium rounded border border-foreground/15 hover:bg-foreground/5 transition-colors">+ Add</button>
                  </div>
                </div>
                {probeQuestions.length > 0 ? (
                  <div className="space-y-2">
                    {probeQuestions.map((q, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-xs font-mono text-foreground/30 mt-2.5 w-4 shrink-0 text-right">{i + 1}</span>
                        <input value={q} onChange={(e) => { const next = [...probeQuestions]; next[i] = e.target.value; setProbeQuestions(next); }}
                          placeholder={`Probe question ${i + 1}`} className={`flex-1 ${inputClass}`} />
                        <button onClick={() => setProbeQuestions(probeQuestions.filter((_, j) => j !== i))}
                          className="text-red-500/60 hover:text-red-500 text-xs px-2">x</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-foreground/30 text-center py-3">No probe questions yet. Click &quot;Generate with AI&quot; to create them.</p>
                )}
              </div>
            </div>
          </div>

          {/* Reference File */}
          <div className={sectionClass}>
            <h3 className="font-semibold mb-2">Reference File</h3>
            {data.referenceFile && (
              <div className="flex items-center gap-3 mb-2">
                <span className="text-foreground/50 text-sm">Reference .kicad_pcb uploaded</span>
                <a href={`/api/admin/assessments/${id}/reference`} className="text-sm text-blue-400 hover:text-blue-300">Download</a>
              </div>
            )}
            <label className="inline-block cursor-pointer text-sm text-foreground/50 hover:text-foreground/70">
              {uploading ? "Uploading..." : data.referenceFile ? "Replace file" : "Upload .kicad_pcb"}
              <input type="file" accept=".kicad_pcb" className="hidden" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRefUpload(f); }} />
            </label>
          </div>

          {/* Save */}
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-foreground text-background text-sm rounded hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving..." : "Save All Changes"}
            </button>
            <button onClick={cancelEditing} className="px-4 py-2 border border-foreground/15 text-sm rounded hover:bg-foreground/5">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8 text-sm">
          {/* Meta bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${data.isActive ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"}`}>
              {data.isActive ? "Active" : "Inactive"}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
              data.difficulty === "easy" ? "bg-green-500/10 text-green-500"
                : data.difficulty === "medium" ? "bg-yellow-500/10 text-yellow-500"
                : "bg-red-500/10 text-red-500"
            }`}>{data.difficulty}</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 uppercase">{data.environment}</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400">{Math.round(data.timeLimit / 60)} min lab</span>
          </div>

          {data.description && (
            <p className="text-foreground/60 leading-relaxed">{data.description}</p>
          )}

          {/* Intro Questions */}
          {renderReadonlyQuestions(data.introConfig, "Intro Questions")}

          {/* Domain Questions */}
          {renderReadonlyQuestions(data.domainConfig, "Domain Questions")}

          {/* Lab Config */}
          <section>
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Lab Config
            </h2>
            {data.labConfig ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-foreground/10 p-4">
                  <h4 className="text-xs font-semibold text-foreground/40 uppercase tracking-wide mb-2">Problem Statement</h4>
                  <p className="text-foreground/70 leading-relaxed">{data.labConfig.problemStatement}</p>
                </div>
                <div className="rounded-lg border border-foreground/10 p-4">
                  <h4 className="text-xs font-semibold text-foreground/40 uppercase tracking-wide mb-3">
                    Checkpoints
                    {data.labConfig.rubric?.strictOrder && (
                      <span className="ml-2 text-yellow-500/80 normal-case tracking-normal font-normal">strict order</span>
                    )}
                  </h4>
                  <div className="space-y-3">
                    {data.labConfig.rubric?.checkpoints?.map((c, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="text-xs font-mono text-foreground/30 mt-0.5 w-4 shrink-0 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium text-foreground/80">{c.name}</span>
                            <span className="text-xs font-mono text-foreground/40 shrink-0">{c.weight}%</span>
                          </div>
                          <p className="text-foreground/40 text-xs">{c.description}</p>
                          <div className="mt-1.5 w-full h-1 bg-foreground/5 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500/40 rounded-full" style={{ width: `${c.weight}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {data.labConfig.probeQuestions && data.labConfig.probeQuestions.length > 0 && (
                  <div className="rounded-lg border border-foreground/10 p-4">
                    <h4 className="text-xs font-semibold text-foreground/40 uppercase tracking-wide mb-3">
                      Probe Questions
                      <span className="ml-2 normal-case tracking-normal font-normal">{data.labConfig.probeQuestions.length} questions</span>
                    </h4>
                    <div className="space-y-2">
                      {data.labConfig.probeQuestions.map((q, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="text-xs font-mono text-foreground/30 mt-0.5 w-4 shrink-0 text-right">{i + 1}</span>
                          <p className="text-foreground/70">{q}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-foreground/30">No lab config</p>
            )}
          </section>

          {/* Reference File */}
          <section>
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
              Reference File
            </h2>
            <div className="rounded-lg border border-foreground/10 p-4 flex items-center justify-between">
              {data.referenceFile ? (
                <>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-foreground/60">.kicad_pcb uploaded</span>
                  </div>
                  <a href={`/api/admin/assessments/${id}/reference`} className="text-xs text-blue-400 hover:text-blue-300">Download</a>
                </>
              ) : (
                <span className="text-foreground/30">No reference file uploaded</span>
              )}
            </div>
            <label className="inline-block mt-2 cursor-pointer text-xs text-foreground/40 hover:text-foreground/60">
              {uploading ? "Uploading..." : data.referenceFile ? "Replace file" : "Upload .kicad_pcb"}
              <input type="file" accept=".kicad_pcb" className="hidden" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRefUpload(f); }} />
            </label>
          </section>
        </div>
      )}
    </div>
  );
}
