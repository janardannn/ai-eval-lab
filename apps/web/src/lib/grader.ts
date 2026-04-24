import { jsonCompletion } from "./ai";

interface Snapshot {
  timestamp: number;
  data: {
    footprints: unknown[];
    tracks: unknown[];
    zones: unknown[];
  };
}

interface QAPair {
  phase: string;
  question: string;
  answer: string;
}

interface Rubric {
  strictOrder?: boolean;
  checkpoints: {
    name: string;
    description: string;
    weight: number;
  }[];
}

export interface GradeResult {
  verdict: string;
  checkpointScores: Record<string, number>;
  timelineAnalysis: string;
  qaAnalysis: string;
  overallReport: string;
}

const SYSTEM_PROMPT = `You are an expert engineering evaluator. You assess students taking a practical PCB design exam.

You will receive:
1. A chronological sequence of board state snapshots showing how the student built their design
2. The task rubric with checkpoints and weights
3. Q&A pairs from the student's intro phase, domain Q&A phase, and lab-phase probing

During the lab phase, the student was periodically probed to explain their thinking, justify design decisions, and describe their process. These lab-phase Q&A pairs are critical for understanding the student's reasoning.

Evaluate the student's PROCESS (not just final result):
- Did they follow a logical component placement order?
- Did they route power before signal traces?
- Did they add bypass capacitors near ICs?
- Did they demonstrate understanding in their intro and domain Q&A answers?
- Did they articulate clear design reasoning when probed during the lab?
- Were their lab explanations consistent with their actual work in the snapshots?

Return a JSON object with:
- verdict: one of "strong_hire", "hire", "neutral", "reject", "strong_reject"
- checkpointScores: object mapping checkpoint names to scores (0-10)
- timelineAnalysis: detailed analysis of the student's build process over time
- qaAnalysis: evaluation of the student's Q&A responses
- overallReport: comprehensive evaluation summary`;

/** LLM JSON may return nested objects for text fields; Prisma expects strings. */
function gradeTextField(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return value == null ? "" : String(value);
}

function normalizeGradeResult(raw: Partial<GradeResult> & Record<string, unknown>): GradeResult {
  const scores = raw.checkpointScores;
  const checkpointScores: Record<string, number> =
    scores && typeof scores === "object" && !Array.isArray(scores)
      ? (scores as Record<string, number>)
      : {};

  return {
    verdict: typeof raw.verdict === "string" ? raw.verdict : "neutral",
    checkpointScores,
    timelineAnalysis: gradeTextField(raw.timelineAnalysis),
    qaAnalysis: gradeTextField(raw.qaAnalysis),
    overallReport: gradeTextField(raw.overallReport),
  };
}

export async function gradeSession(
  snapshots: Snapshot[],
  qaPairs: QAPair[],
  rubric: Rubric
): Promise<GradeResult> {
  const timeline = snapshots.map((s, i) => {
    const elapsed = i === 0 ? 0 : Math.round(s.timestamp - snapshots[0].timestamp);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `T=${mins}:${String(secs).padStart(2, "0")} → ${s.data.footprints.length} footprints, ${s.data.tracks.length} tracks, ${s.data.zones.length} zones`;
  });

  const userPrompt = `## Task Rubric
${JSON.stringify(rubric, null, 2)}

## Board State Timeline (${snapshots.length} snapshots)
${timeline.join("\n")}

## Full Snapshots (first, middle, last)
First: ${JSON.stringify(snapshots[0]?.data)}
Middle: ${JSON.stringify(snapshots[Math.floor(snapshots.length / 2)]?.data)}
Last: ${JSON.stringify(snapshots[snapshots.length - 1]?.data)}

## Q&A Pairs
${qaPairs.map((qa) => `[${qa.phase}] Q: ${qa.question}\nA: ${qa.answer}`).join("\n\n")}`;

  const raw = await jsonCompletion<Partial<GradeResult> & Record<string, unknown>>(
    SYSTEM_PROMPT,
    userPrompt
  );
  return normalizeGradeResult(raw);
}
