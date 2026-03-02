"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["General", "Intro", "Domain", "Lab", "Review"];

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

interface CheckpointDraft {
  name: string;
  description: string;
  weight: number;
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

  const [introQuestions, setIntroQuestions] = useState<QuestionDraft[]>([
    { text: "Tell me about yourself and your background.", timeLimit: 0, followUps: [] },
    { text: "What's your experience with PCB design or electronics?", timeLimit: 0, followUps: [] },
    { text: "What motivated you to take this assessment?", timeLimit: 0, followUps: [] },
  ]);

  const [domainQuestions, setDomainQuestions] = useState<QuestionDraft[]>([
    { text: "", timeLimit: 0, followUps: [] },
  ]);

  const [problemStatement, setProblemStatement] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [strictOrder, setStrictOrder] = useState(false);
  const [checkpoints, setCheckpoints] = useState<CheckpointDraft[]>([
    { name: "", description: "", weight: 0 },
  ]);

  function updateQuestion(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, i: number, text: string) {
    const next = [...list];
    next[i] = { ...next[i], text };
    setList(next);
  }

  function updateQuestionTimeLimit(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, i: number, timeLimit: number) {
    const next = [...list];
    next[i] = { ...next[i], timeLimit };
    setList(next);
  }

  function removeQuestion(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, i: number) {
    setList(list.filter((_, j) => j !== i));
  }

  function addFollowUp(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, i: number) {
    const next = [...list];
    next[i] = { ...next[i], followUps: [...next[i].followUps, { text: "", timeLimit: 0, sameAsParent: true }] };
    setList(next);
  }

  function updateFollowUp(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, qi: number, fi: number, val: string) {
    const next = [...list];
    const fups = [...next[qi].followUps];
    fups[fi] = { ...fups[fi], text: val };
    next[qi] = { ...next[qi], followUps: fups };
    setList(next);
  }

  function updateFollowUpTimer(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, qi: number, fi: number, timeLimit: number) {
    const next = [...list];
    const fups = [...next[qi].followUps];
    fups[fi] = { ...fups[fi], timeLimit };
    next[qi] = { ...next[qi], followUps: fups };
    setList(next);
  }

  function toggleFollowUpSameAsParent(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, qi: number, fi: number) {
    const next = [...list];
    const fups = [...next[qi].followUps];
    fups[fi] = { ...fups[fi], sameAsParent: !fups[fi].sameAsParent, timeLimit: 0 };
    next[qi] = { ...next[qi], followUps: fups };
    setList(next);
  }

  function removeFollowUp(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, qi: number, fi: number) {
    const next = [...list];
    next[qi] = { ...next[qi], followUps: next[qi].followUps.filter((_, j) => j !== fi) };
    setList(next);
  }

  function totalWeight() {
    return checkpoints.reduce((s, c) => s + c.weight, 0);
  }

  function filterQuestions(list: QuestionDraft[]) {
    return list
      .filter((q) => q.text.trim())
      .map((q) => {
        const validFollowUps = q.followUps.filter((f) => f.text.trim());
        return {
          text: q.text.trim(),
          ...(q.timeLimit > 0 ? { timeLimit: q.timeLimit * 60 } : {}),
          ...(validFollowUps.length > 0
            ? {
                followUps: validFollowUps.map((f) => ({
                  text: f.text.trim(),
                  ...(f.sameAsParent || f.timeLimit <= 0 ? {} : { timeLimit: f.timeLimit * 60 }),
                })),
              }
            : {}),
        };
      });
  }

  function countTotal(list: QuestionDraft[]) {
    return list.filter((q) => q.text.trim()).reduce((s, q) => s + 1 + q.followUps.filter((f) => f.text.trim()).length, 0);
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
      introConfig: { questions: filterQuestions(introQuestions) },
      domainConfig: { questions: filterQuestions(domainQuestions) },
      labConfig: {
        problemStatement,
        rubric: { strictOrder, checkpoints: checkpoints.filter((c) => c.name.trim()) },
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

  function renderQuestionList(list: QuestionDraft[], setList: (v: QuestionDraft[]) => void, label: string) {
    return (
      <div className="space-y-4">
        <label className="text-sm text-foreground/60">{label}</label>
        {list.map((q, i) => (
          <div key={i} className="space-y-2">
            <div className="flex gap-2">
              <input
                value={q.text}
                onChange={(e) => updateQuestion(list, setList, i, e.target.value)}
                placeholder={`Question ${i + 1}`}
                className="flex-1 p-2 border border-foreground/15 rounded bg-background text-sm"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={q.timeLimit || ""}
                  onChange={(e) => updateQuestionTimeLimit(list, setList, i, Number(e.target.value))}
                  placeholder="min"
                  className="w-16 p-2 border border-foreground/15 rounded bg-background text-sm text-center"
                />
                <span className="text-xs text-foreground/30">m</span>
              </div>
              <button onClick={() => removeQuestion(list, setList, i)}
                className="text-red-500/60 hover:text-red-500 text-xs px-2">remove</button>
            </div>
            {q.followUps.map((f, fi) => (
              <div key={fi} className="space-y-1 ml-6">
                <div className="flex gap-2">
                  <span className="text-foreground/30 text-xs mt-2.5">↳</span>
                  <input
                    value={f.text}
                    onChange={(e) => updateFollowUp(list, setList, i, fi, e.target.value)}
                    placeholder={`Follow-up ${fi + 1}`}
                    className="flex-1 p-2 border border-foreground/10 rounded bg-background text-sm"
                  />
                  {!f.sameAsParent && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={f.timeLimit || ""}
                        onChange={(e) => updateFollowUpTimer(list, setList, i, fi, Number(e.target.value))}
                        placeholder="sec"
                        className="w-16 p-2 border border-foreground/10 rounded bg-background text-sm text-center"
                      />
                      <span className="text-xs text-foreground/30">s</span>
                    </div>
                  )}
                  <button onClick={() => removeFollowUp(list, setList, i, fi)}
                    className="text-red-500/60 hover:text-red-500 text-xs px-2">x</button>
                </div>
                <label className="flex items-center gap-1.5 ml-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={f.sameAsParent}
                    onChange={() => toggleFollowUpSameAsParent(list, setList, i, fi)}
                    className="w-3 h-3"
                  />
                  <span className="text-xs text-foreground/30">Same as parent</span>
                </label>
              </div>
            ))}
            <button onClick={() => addFollowUp(list, setList, i)}
              className="text-xs text-foreground/30 hover:text-foreground/60 ml-6">+ Add follow-up</button>
          </div>
        ))}
        <button onClick={() => setList([...list, { text: "", timeLimit: 0, followUps: [] }])}
          className="text-sm text-foreground/40 hover:text-foreground/70">+ Add question</button>
      </div>
    );
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
      {step === 1 && renderQuestionList(introQuestions, setIntroQuestions, "Intro Questions")}

      {/* Step 3: Domain */}
      {step === 2 && renderQuestionList(domainQuestions, setDomainQuestions, "Domain Questions")}

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
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={strictOrder} onChange={(e) => setStrictOrder(e.target.checked)} />
                  Strict ordering
                </label>
                <button
                  onClick={() => setCheckpoints([...checkpoints, { name: "", description: "", weight: 0 }])}
                  className="text-sm text-foreground/40 hover:text-foreground/70"
                >+ Add checkpoint</button>
              </div>
            </div>
            {strictOrder && (
              <p className="text-xs text-foreground/40 mb-2">Checkpoints must be completed in the order listed. The grader will penalize out-of-order work.</p>
            )}
            <div className="space-y-3">
              {checkpoints.map((cp, i) => (
                <div key={i} className="border border-foreground/10 rounded p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    {strictOrder && <span className="text-xs text-foreground/30 w-5 text-center shrink-0">{i + 1}</span>}
                    <input value={cp.name} placeholder="Checkpoint name"
                      onChange={(e) => {
                        const next = [...checkpoints];
                        next[i] = { ...cp, name: e.target.value };
                        setCheckpoints(next);
                      }}
                      className="flex-1 p-2 border border-foreground/15 rounded bg-background text-sm" />
                    <div className="flex items-center gap-1">
                      <input type="number" value={cp.weight} placeholder="Wt"
                        onChange={(e) => {
                          const next = [...checkpoints];
                          next[i] = { ...cp, weight: Number(e.target.value) };
                          setCheckpoints(next);
                        }}
                        className="w-16 p-2 border border-foreground/15 rounded bg-background text-sm text-center" />
                      <span className="text-xs text-foreground/30">%</span>
                    </div>
                    <button onClick={() => setCheckpoints(checkpoints.filter((_, j) => j !== i))}
                      className="text-red-500/60 hover:text-red-500 text-xs px-2">x</button>
                  </div>
                  <input value={cp.description} placeholder="What the student should accomplish"
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
            <h3 className="font-semibold">Intro ({countTotal(introQuestions)} total questions)</h3>
            {filterQuestions(introQuestions).map((q, i) => (
              <div key={i}>
                <p className="text-foreground/60">
                  {i + 1}. {q.text}
                  {q.timeLimit ? <span className="text-foreground/30 ml-2">({Math.round(q.timeLimit / 60)}m)</span> : null}
                </p>
                {q.followUps?.map((f: { text: string; timeLimit?: number }, fi: number) => (
                  <p key={fi} className="text-foreground/40 ml-6">
                    ↳ {f.text}
                    {f.timeLimit ? <span className="text-foreground/30 ml-2">({Math.round(f.timeLimit / 60)}m)</span> : null}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <div className="border border-foreground/10 rounded p-4 space-y-2">
            <h3 className="font-semibold">Domain ({countTotal(domainQuestions)} total questions)</h3>
            {filterQuestions(domainQuestions).map((q, i) => (
              <div key={i}>
                <p className="text-foreground/60">
                  {i + 1}. {q.text}
                  {q.timeLimit ? <span className="text-foreground/30 ml-2">({Math.round(q.timeLimit / 60)}m)</span> : null}
                </p>
                {q.followUps?.map((f: { text: string; timeLimit?: number }, fi: number) => (
                  <p key={fi} className="text-foreground/40 ml-6">
                    ↳ {f.text}
                    {f.timeLimit ? <span className="text-foreground/30 ml-2">({Math.round(f.timeLimit / 60)}m)</span> : null}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <div className="border border-foreground/10 rounded p-4 space-y-2">
            <h3 className="font-semibold">Lab ({checkpoints.filter(c => c.name.trim()).length} checkpoints, {totalWeight()}/100 weight{strictOrder ? ", strict order" : ""})</h3>
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
