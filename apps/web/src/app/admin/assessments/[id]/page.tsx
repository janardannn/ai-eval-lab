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

interface QuestionDraft {
  text: string;
  followUps: string[];
}

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Assessment | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  useEffect(() => {
    fetch(`/api/admin/assessments/${id}`)
      .then((r) => r.json())
      .then((d: Assessment) => {
        setData(d);
        populateForm(d);
      });
  }, [id]);

  function toDrafts(items: QuestionItem[]): QuestionDraft[] {
    return items.map((q) => ({ text: q.text, followUps: [...(q.followUps || [])] }));
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
  }

  function startEditing() { if (data) populateForm(data); setEditing(true); }
  function cancelEditing() { if (data) populateForm(data); setEditing(false); }

  function totalWeight() { return checkpoints.reduce((s, c) => s + c.weight, 0); }

  function filterQuestions(list: QuestionDraft[]) {
    return list
      .filter((q) => q.text.trim())
      .map((q) => ({
        text: q.text.trim(),
        ...(q.followUps.filter((f) => f.trim()).length > 0
          ? { followUps: q.followUps.filter((f) => f.trim()) }
          : {}),
      }));
  }

  function updateQuestion(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, i: number, text: string) {
    const next = [...list]; next[i] = { ...next[i], text }; setList(next);
  }

  function removeQuestion(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, i: number) {
    setList(list.filter((_, j) => j !== i));
  }

  function addFollowUp(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, i: number) {
    const next = [...list]; next[i] = { ...next[i], followUps: [...next[i].followUps, ""] }; setList(next);
  }

  function updateFollowUp(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, qi: number, fi: number, val: string) {
    const next = [...list]; const fups = [...next[qi].followUps]; fups[fi] = val;
    next[qi] = { ...next[qi], followUps: fups }; setList(next);
  }

  function removeFollowUp(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, qi: number, fi: number) {
    const next = [...list]; next[qi] = { ...next[qi], followUps: next[qi].followUps.filter((_, j) => j !== fi) }; setList(next);
  }

  async function handleSave() {
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
          rubric: { strictOrder, checkpoints: checkpoints.filter((c) => c.name.trim()) },
        },
      }),
    });

    const res = await fetch(`/api/admin/assessments/${id}`);
    const updated = await res.json();
    setData(updated);
    setEditing(false);
    setSaving(false);
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
                <button onClick={() => removeQuestion(list, setList, i)}
                  className="text-red-500/60 hover:text-red-500 text-xs px-2">remove</button>
              </div>
              {q.followUps.map((f, fi) => (
                <div key={fi} className="flex gap-2 ml-6">
                  <span className="text-foreground/30 text-xs mt-2.5">↳</span>
                  <input value={f} onChange={(e) => updateFollowUp(list, setList, i, fi, e.target.value)}
                    placeholder={`Follow-up ${fi + 1}`} className={`flex-1 ${inputClass}`} />
                  <button onClick={() => removeFollowUp(list, setList, i, fi)}
                    className="text-red-500/60 hover:text-red-500 text-xs px-2">x</button>
                </div>
              ))}
              <button onClick={() => addFollowUp(list, setList, i)}
                className="text-xs text-foreground/30 hover:text-foreground/60 ml-6">+ Add follow-up</button>
            </div>
          ))}
          <button onClick={() => setList([...list, { text: "", followUps: [] }])}
            className="text-sm text-foreground/40 hover:text-foreground/70">+ Add question</button>
        </div>
      </div>
    );
  }

  function renderQuestionReadonly(config: PhaseConfig, label: string) {
    const total = config.questions.reduce((s, q) => s + 1 + (q.followUps?.length ?? 0), 0);
    return (
      <div className={sectionClass}>
        <h3 className="font-semibold mb-2">{label}</h3>
        <p className="text-foreground/50 mb-2">{total} total questions</p>
        {config.questions.map((q, i) => (
          <div key={i} className="mb-1">
            <p className="text-foreground/60 ml-2">{i + 1}. {q.text}</p>
            {q.followUps?.map((f, fi) => (
              <p key={fi} className="text-foreground/40 ml-8">↳ {f}</p>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
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
          {/* General */}
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
        <div className="space-y-6 text-sm">
          <div className="flex gap-3">
            <span className={`px-2 py-0.5 rounded text-xs ${data.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
              {data.isActive ? "Active" : "Inactive"}
            </span>
            <span className="text-foreground/50 capitalize">{data.difficulty}</span>
            <span className="text-foreground/50">{data.environment}</span>
            <span className="text-foreground/50">{Math.round(data.timeLimit / 60)} min (lab)</span>
          </div>
          <p className="text-foreground/70 leading-relaxed">{data.description}</p>

          {renderQuestionReadonly(data.introConfig, "Intro Config")}
          {renderQuestionReadonly(data.domainConfig, "Domain Config")}

          <div className={sectionClass}>
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

          <div className={sectionClass}>
            <h3 className="font-semibold mb-2">Reference File</h3>
            {data.referenceFile ? (
              <div className="flex items-center gap-3">
                <span className="text-foreground/50">Reference .kicad_pcb uploaded</span>
                <a href={`/api/admin/assessments/${id}/reference`} className="text-sm text-blue-400 hover:text-blue-300">Download</a>
              </div>
            ) : (
              <p className="text-foreground/40">No reference file</p>
            )}
            <label className="inline-block mt-2 cursor-pointer text-sm text-foreground/50 hover:text-foreground/70">
              {uploading ? "Uploading..." : "Upload new"}
              <input type="file" accept=".kicad_pcb" className="hidden" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRefUpload(f); }} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
