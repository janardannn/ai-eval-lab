"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Checkpoint {
  name: string;
  description: string;
  weight: number;
}

interface IntroConfig {
  questions: string[];
  adaptive: boolean;
  maxQuestions: number;
  maxProbeDepth?: number;
}

interface DomainConfig {
  questions: string[];
  adaptive: boolean;
  maxQuestions: number;
  adaptivePrompt?: string;
  maxProbeDepth?: number;
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
  introConfig: IntroConfig;
  domainConfig: DomainConfig;
  labConfig: LabConfig;
  referenceFile: boolean;
  isActive: boolean;
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

  const [introQuestions, setIntroQuestions] = useState<string[]>([]);
  const [introAdaptive, setIntroAdaptive] = useState(false);
  const [introProbeDepth, setIntroProbeDepth] = useState(1);

  const [domainQuestions, setDomainQuestions] = useState<string[]>([]);
  const [domainAdaptive, setDomainAdaptive] = useState(true);
  const [domainProbeDepth, setDomainProbeDepth] = useState(2);
  const [domainPrompt, setDomainPrompt] = useState("");

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

  function populateForm(a: Assessment) {
    setTitle(a.title);
    setDescription(a.description);
    setDifficulty(a.difficulty);
    setTimeLimit(Math.round(a.timeLimit / 60));
    setIntroQuestions([...a.introConfig.questions]);
    setIntroAdaptive(a.introConfig.adaptive);
    setIntroProbeDepth(a.introConfig.maxProbeDepth ?? 1);
    setDomainQuestions([...a.domainConfig.questions]);
    setDomainAdaptive(a.domainConfig.adaptive);
    setDomainProbeDepth(a.domainConfig.maxProbeDepth ?? 2);
    setDomainPrompt(a.domainConfig.adaptivePrompt || "");
    setProblemStatement(a.labConfig.problemStatement);
    setStrictOrder(a.labConfig.rubric.strictOrder ?? false);
    setCheckpoints(a.labConfig.rubric.checkpoints.map(({ name, description, weight }) => ({ name, description, weight })));
  }

  function startEditing() {
    if (data) populateForm(data);
    setEditing(true);
  }

  function cancelEditing() {
    if (data) populateForm(data);
    setEditing(false);
  }

  function totalWeight() {
    return checkpoints.reduce((s, c) => s + c.weight, 0);
  }

  async function handleSave() {
    if (totalWeight() !== 100) {
      alert("Checkpoint weights must sum to 100");
      return;
    }

    setSaving(true);
    const filteredIntro = introQuestions.filter((q) => q.trim());
    const filteredDomain = domainQuestions.filter((q) => q.trim());

    await fetch(`/api/admin/assessments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        difficulty,
        timeLimit: timeLimit * 60,
        introConfig: {
          questions: filteredIntro,
          adaptive: introAdaptive,
          maxQuestions: filteredIntro.length,
          maxProbeDepth: introAdaptive ? introProbeDepth : 0,
        },
        domainConfig: {
          questions: filteredDomain,
          adaptive: domainAdaptive,
          maxQuestions: filteredDomain.length,
          adaptivePrompt: domainPrompt,
          maxProbeDepth: domainAdaptive ? domainProbeDepth : 0,
        },
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
    const res = await fetch(`/api/admin/assessments/${id}/reference`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      setData((prev) => prev ? { ...prev, referenceFile: true } : prev);
    }
    setUploading(false);
  }

  if (!data) return <div className="text-foreground/40">Loading...</div>;

  const inputClass = "w-full p-2 border border-foreground/15 rounded bg-background text-sm";
  const sectionClass = "border border-foreground/10 rounded p-4";

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

          {/* Intro */}
          <div className={sectionClass}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Intro Questions</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={introAdaptive} onChange={(e) => setIntroAdaptive(e.target.checked)} />
                  Adaptive
                </label>
                {introAdaptive && (
                  <label className="flex items-center gap-1.5 text-xs text-foreground/50">
                    Probe depth
                    <input type="number" min={1} max={5} value={introProbeDepth}
                      onChange={(e) => setIntroProbeDepth(Number(e.target.value))}
                      className="w-14 p-1 border border-foreground/15 rounded bg-background text-sm text-center" />
                  </label>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {introQuestions.map((q, i) => (
                <div key={i} className="flex gap-2">
                  <input value={q} onChange={(e) => { const n = [...introQuestions]; n[i] = e.target.value; setIntroQuestions(n); }}
                    placeholder={`Question ${i + 1}`} className={`flex-1 ${inputClass}`} />
                  <button onClick={() => setIntroQuestions(introQuestions.filter((_, j) => j !== i))}
                    className="text-red-500/60 hover:text-red-500 text-xs px-2">remove</button>
                </div>
              ))}
              <button onClick={() => setIntroQuestions([...introQuestions, ""])}
                className="text-sm text-foreground/40 hover:text-foreground/70">+ Add question</button>
            </div>
          </div>

          {/* Domain */}
          <div className={sectionClass}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Domain Questions</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={domainAdaptive} onChange={(e) => setDomainAdaptive(e.target.checked)} />
                  Adaptive
                </label>
                {domainAdaptive && (
                  <label className="flex items-center gap-1.5 text-xs text-foreground/50">
                    Probe depth
                    <input type="number" min={1} max={5} value={domainProbeDepth}
                      onChange={(e) => setDomainProbeDepth(Number(e.target.value))}
                      className="w-14 p-1 border border-foreground/15 rounded bg-background text-sm text-center" />
                  </label>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {domainQuestions.map((q, i) => (
                <div key={i} className="flex gap-2">
                  <input value={q} onChange={(e) => { const n = [...domainQuestions]; n[i] = e.target.value; setDomainQuestions(n); }}
                    placeholder={`Question ${i + 1}`} className={`flex-1 ${inputClass}`} />
                  <button onClick={() => setDomainQuestions(domainQuestions.filter((_, j) => j !== i))}
                    className="text-red-500/60 hover:text-red-500 text-xs px-2">remove</button>
                </div>
              ))}
              <button onClick={() => setDomainQuestions([...domainQuestions, ""])}
                className="text-sm text-foreground/40 hover:text-foreground/70">+ Add question</button>
            </div>
            {domainAdaptive && (
              <div className="mt-3">
                <label className="text-xs text-foreground/50 block mb-1">Adaptive Prompt</label>
                <textarea value={domainPrompt} onChange={(e) => setDomainPrompt(e.target.value)}
                  rows={3} className={`${inputClass} resize-none`} />
              </div>
            )}
          </div>

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
                  <p className="text-xs text-foreground/40 mb-2">Checkpoints must be completed in the order listed below. Drag to reorder.</p>
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

          <div className={sectionClass}>
            <h3 className="font-semibold mb-2">Intro Config</h3>
            <p className="text-foreground/50 mb-2">
              {data.introConfig.questions.length} questions, {data.introConfig.adaptive ? `adaptive, depth ${data.introConfig.maxProbeDepth ?? "—"}` : "static"}
            </p>
            {data.introConfig.questions.map((q, i) => <p key={i} className="text-foreground/60 ml-2">{i + 1}. {q}</p>)}
          </div>

          <div className={sectionClass}>
            <h3 className="font-semibold mb-2">Domain Config</h3>
            <p className="text-foreground/50 mb-2">
              {data.domainConfig.questions.length} questions, {data.domainConfig.adaptive ? `adaptive, depth ${data.domainConfig.maxProbeDepth ?? "—"}` : "static"}
            </p>
            {data.domainConfig.questions.map((q, i) => <p key={i} className="text-foreground/60 ml-2">{i + 1}. {q}</p>)}
            {data.domainConfig.adaptivePrompt && (
              <p className="text-foreground/40 mt-2 text-xs italic">{data.domainConfig.adaptivePrompt}</p>
            )}
          </div>

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
