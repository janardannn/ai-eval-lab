"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["General", "Intro", "Domain", "Lab", "Review"];

interface CheckpointDraft {
  name: string;
  description: string;
  weight: number;
  expectedOrder: number;
}

export default function NewAssessmentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [general, setGeneral] = useState({
    title: "",
    description: "",
    difficulty: "easy",
    environment: "kicad",
    timeLimit: 1800,
  });

  const [introQuestions, setIntroQuestions] = useState<string[]>([
    "Tell me about yourself and your background.",
    "What's your experience with PCB design or electronics?",
    "What motivated you to take this assessment?",
  ]);
  const [introAdaptive, setIntroAdaptive] = useState(false);
  const [introProbeDepth, setIntroProbeDepth] = useState(1);

  const [domainQuestions, setDomainQuestions] = useState<string[]>([""]);
  const [domainAdaptive, setDomainAdaptive] = useState(true);
  const [domainProbeDepth, setDomainProbeDepth] = useState(2);
  const [domainPrompt, setDomainPrompt] = useState(
    "You are evaluating a candidate's technical knowledge. Based on their previous answers, either probe deeper on weak areas or advance. Focus on practical understanding."
  );

  const [problemStatement, setProblemStatement] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [checkpoints, setCheckpoints] = useState<CheckpointDraft[]>([
    { name: "", description: "", weight: 0, expectedOrder: 1 },
  ]);

  function addQuestion(list: string[], setList: (v: string[]) => void) {
    setList([...list, ""]);
  }

  function updateQuestion(list: string[], setList: (v: string[]) => void, i: number, val: string) {
    const next = [...list];
    next[i] = val;
    setList(next);
  }

  function removeQuestion(list: string[], setList: (v: string[]) => void, i: number) {
    setList(list.filter((_, j) => j !== i));
  }

  function totalWeight() {
    return checkpoints.reduce((s, c) => s + c.weight, 0);
  }

  async function handleCreate() {
    setError(null);
    setSaving(true);

    if (totalWeight() !== 100) {
      setError("Checkpoint weights must sum to 100");
      setSaving(false);
      return;
    }

    const payload = {
      ...general,
      introConfig: {
        questions: introQuestions.filter((q) => q.trim()),
        adaptive: introAdaptive,
        maxQuestions: introQuestions.filter((q) => q.trim()).length,
        maxProbeDepth: introAdaptive ? introProbeDepth : 0,
      },
      domainConfig: {
        questions: domainQuestions.filter((q) => q.trim()),
        adaptive: domainAdaptive,
        maxQuestions: domainQuestions.filter((q) => q.trim()).length,
        adaptivePrompt: domainPrompt,
        maxProbeDepth: domainAdaptive ? domainProbeDepth : 0,
      },
      labConfig: {
        problemStatement,
        rubric: { checkpoints: checkpoints.filter((c) => c.name.trim()) },
      },
    };

    const res = await fetch("/api/admin/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create");
      setSaving(false);
      return;
    }

    const created = await res.json();

    if (referenceFile && created.id) {
      const formData = new FormData();
      formData.append("file", referenceFile);
      await fetch(`/api/admin/assessments/${created.id}/reference`, {
        method: "POST",
        body: formData,
      });
    }

    router.push("/admin/assessments");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">New Assessment</h1>

      {/* Step indicator */}
      <div className="flex gap-1 mb-8">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`flex-1 text-xs py-2 rounded ${i === step ? "bg-foreground text-background" : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Step 1: General */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-foreground/60 block mb-1">Title</label>
            <input value={general.title} onChange={(e) => setGeneral({ ...general, title: e.target.value })}
              className="w-full p-2 border border-foreground/15 rounded bg-background text-sm" />
          </div>
          <div>
            <label className="text-sm text-foreground/60 block mb-1">Description</label>
            <textarea value={general.description} onChange={(e) => setGeneral({ ...general, description: e.target.value })}
              rows={4} className="w-full p-2 border border-foreground/15 rounded bg-background text-sm resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-foreground/60 block mb-1">Difficulty</label>
              <select value={general.difficulty} onChange={(e) => setGeneral({ ...general, difficulty: e.target.value })}
                className="w-full p-2 border border-foreground/15 rounded bg-background text-sm">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-foreground/60 block mb-1">Environment</label>
              <select value={general.environment} onChange={(e) => setGeneral({ ...general, environment: e.target.value })}
                className="w-full p-2 border border-foreground/15 rounded bg-background text-sm">
                <option value="kicad">KiCad</option>
                <option value="freecad">FreeCAD</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-foreground/60 block mb-1">Lab Time (min)</label>
              <input type="number" value={Math.round(general.timeLimit / 60)}
                onChange={(e) => setGeneral({ ...general, timeLimit: Number(e.target.value) * 60 })}
                placeholder="Lab only, excl. Q&A"
                className="w-full p-2 border border-foreground/15 rounded bg-background text-sm" />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Intro */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-foreground/60">Intro Questions</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={introAdaptive} onChange={(e) => setIntroAdaptive(e.target.checked)} />
                Adaptive
              </label>
              {introAdaptive && (
                <label className="flex items-center gap-1.5 text-sm text-foreground/60">
                  Probe depth
                  <input type="number" min={1} max={5} value={introProbeDepth}
                    onChange={(e) => setIntroProbeDepth(Number(e.target.value))}
                    className="w-14 p-1 border border-foreground/15 rounded bg-background text-sm text-center" />
                </label>
              )}
            </div>
          </div>
          {introQuestions.map((q, i) => (
            <div key={i} className="flex gap-2">
              <input value={q} onChange={(e) => updateQuestion(introQuestions, setIntroQuestions, i, e.target.value)}
                placeholder={`Question ${i + 1}`}
                className="flex-1 p-2 border border-foreground/15 rounded bg-background text-sm" />
              <button onClick={() => removeQuestion(introQuestions, setIntroQuestions, i)}
                className="text-red-500/60 hover:text-red-500 text-xs px-2">remove</button>
            </div>
          ))}
          <button onClick={() => addQuestion(introQuestions, setIntroQuestions)}
            className="text-sm text-foreground/40 hover:text-foreground/70">+ Add question</button>
        </div>
      )}

      {/* Step 3: Domain */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-foreground/60">Domain Questions</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={domainAdaptive} onChange={(e) => setDomainAdaptive(e.target.checked)} />
                Adaptive
              </label>
              {domainAdaptive && (
                <label className="flex items-center gap-1.5 text-sm text-foreground/60">
                  Probe depth
                  <input type="number" min={1} max={5} value={domainProbeDepth}
                    onChange={(e) => setDomainProbeDepth(Number(e.target.value))}
                    className="w-14 p-1 border border-foreground/15 rounded bg-background text-sm text-center" />
                </label>
              )}
            </div>
          </div>
          {domainQuestions.map((q, i) => (
            <div key={i} className="flex gap-2">
              <input value={q} onChange={(e) => updateQuestion(domainQuestions, setDomainQuestions, i, e.target.value)}
                placeholder={`Question ${i + 1}`}
                className="flex-1 p-2 border border-foreground/15 rounded bg-background text-sm" />
              <button onClick={() => removeQuestion(domainQuestions, setDomainQuestions, i)}
                className="text-red-500/60 hover:text-red-500 text-xs px-2">remove</button>
            </div>
          ))}
          <button onClick={() => addQuestion(domainQuestions, setDomainQuestions)}
            className="text-sm text-foreground/40 hover:text-foreground/70">+ Add question</button>
          {domainAdaptive && (
            <div>
              <label className="text-sm text-foreground/60 block mb-1">Adaptive Prompt</label>
              <textarea value={domainPrompt} onChange={(e) => setDomainPrompt(e.target.value)}
                rows={3} className="w-full p-2 border border-foreground/15 rounded bg-background text-sm resize-none" />
            </div>
          )}
        </div>
      )}

      {/* Step 4: Lab */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-foreground/60 block mb-1">Problem Statement</label>
            <textarea value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)}
              rows={4} className="w-full p-2 border border-foreground/15 rounded bg-background text-sm resize-none" />
          </div>
          <div>
            <label className="text-sm text-foreground/60 block mb-1">Reference File (.kicad_pcb)</label>
            <input
              type="file"
              accept=".kicad_pcb"
              onChange={(e) => setReferenceFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-foreground/60 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-foreground/15 file:text-sm file:bg-background file:text-foreground/70 hover:file:bg-foreground/5"
            />
            {referenceFile && (
              <p className="text-xs text-foreground/40 mt-1">{referenceFile.name} ({(referenceFile.size / 1024).toFixed(1)} KB)</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-foreground/60">
                Rubric Checkpoints <span className={totalWeight() === 100 ? "text-green-500" : "text-red-400"}>({totalWeight()}/100)</span>
              </label>
              <button
                onClick={() => setCheckpoints([...checkpoints, { name: "", description: "", weight: 0, expectedOrder: checkpoints.length + 1 }])}
                className="text-sm text-foreground/40 hover:text-foreground/70"
              >+ Add checkpoint</button>
            </div>
            <div className="space-y-3">
              {checkpoints.map((cp, i) => (
                <div key={i} className="border border-foreground/10 rounded p-3 space-y-2">
                  <div className="flex gap-2">
                    <input value={cp.name} placeholder="Checkpoint name"
                      onChange={(e) => {
                        const next = [...checkpoints];
                        next[i] = { ...cp, name: e.target.value };
                        setCheckpoints(next);
                      }}
                      className="flex-1 p-2 border border-foreground/15 rounded bg-background text-sm" />
                    <input type="number" value={cp.weight} placeholder="Weight"
                      onChange={(e) => {
                        const next = [...checkpoints];
                        next[i] = { ...cp, weight: Number(e.target.value) };
                        setCheckpoints(next);
                      }}
                      className="w-20 p-2 border border-foreground/15 rounded bg-background text-sm" />
                    <input type="number" value={cp.expectedOrder} placeholder="Order"
                      onChange={(e) => {
                        const next = [...checkpoints];
                        next[i] = { ...cp, expectedOrder: Number(e.target.value) };
                        setCheckpoints(next);
                      }}
                      className="w-16 p-2 border border-foreground/15 rounded bg-background text-sm" />
                    <button onClick={() => setCheckpoints(checkpoints.filter((_, j) => j !== i))}
                      className="text-red-500/60 hover:text-red-500 text-xs px-2">x</button>
                  </div>
                  <input value={cp.description} placeholder="Description"
                    onChange={(e) => {
                      const next = [...checkpoints];
                      next[i] = { ...cp, description: e.target.value };
                      setCheckpoints(next);
                    }}
                    className="w-full p-2 border border-foreground/15 rounded bg-background text-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Review */}
      {step === 4 && (
        <div className="space-y-4 text-sm">
          <div className="border border-foreground/10 rounded p-4 space-y-3">
            <h3 className="font-semibold">General</h3>
            <p><span className="text-foreground/50">Title:</span> {general.title}</p>
            <p><span className="text-foreground/50">Difficulty:</span> {general.difficulty}</p>
            <p><span className="text-foreground/50">Environment:</span> {general.environment}</p>
            <p><span className="text-foreground/50">Time:</span> {Math.round(general.timeLimit / 60)} min</p>
          </div>
          <div className="border border-foreground/10 rounded p-4 space-y-2">
            <h3 className="font-semibold">Intro ({introQuestions.filter(q => q.trim()).length} questions{introAdaptive ? `, adaptive, depth ${introProbeDepth}` : ""})</h3>
            {introQuestions.filter(q => q.trim()).map((q, i) => <p key={i} className="text-foreground/60">{i + 1}. {q}</p>)}
          </div>
          <div className="border border-foreground/10 rounded p-4 space-y-2">
            <h3 className="font-semibold">Domain ({domainQuestions.filter(q => q.trim()).length} questions{domainAdaptive ? `, adaptive, depth ${domainProbeDepth}` : ""})</h3>
            {domainQuestions.filter(q => q.trim()).map((q, i) => <p key={i} className="text-foreground/60">{i + 1}. {q}</p>)}
          </div>
          <div className="border border-foreground/10 rounded p-4 space-y-2">
            <h3 className="font-semibold">Lab ({checkpoints.filter(c => c.name.trim()).length} checkpoints, {totalWeight()}/100 weight)</h3>
            <p className="text-foreground/60">{problemStatement}</p>
            {checkpoints.filter(c => c.name.trim()).map((c, i) => (
              <p key={i} className="text-foreground/60">{c.name} — {c.weight}%</p>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="px-4 py-2 border border-foreground/15 text-sm rounded hover:bg-foreground/5 disabled:opacity-30"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="px-4 py-2 bg-foreground text-background text-sm rounded hover:opacity-90"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-4 py-2 bg-foreground text-background text-sm rounded hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Assessment"}
          </button>
        )}
      </div>
    </div>
  );
}
