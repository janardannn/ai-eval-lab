interface Question {
  timeLimit: number;
  followUps?: { timeLimit: number }[];
}

export function getTotalTime(assessment: { timeLimit: number; introConfig: unknown; domainConfig: unknown }) {
  let total = assessment.timeLimit;
  for (const config of [assessment.introConfig, assessment.domainConfig]) {
    const questions = (config as { questions?: Question[] })?.questions ?? [];
    for (const q of questions) {
      total += q.timeLimit;
      if (q.followUps) {
        for (const f of q.followUps) total += f.timeLimit;
      }
    }
  }
  return total;
}
