"use client";

import { useState, useCallback } from "react";

interface AIProctorProps {
  sessionId: string;
  phase: "intro" | "domain" | "lab";
  onPhaseComplete: () => void;
}

interface QAEntry {
  question: string;
  answer?: string;
}

export function AIProctor({ sessionId, phase, onPhaseComplete }: AIProctorProps) {
  const [qaHistory, setQaHistory] = useState<QAEntry[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");

  const fetchQuestion = useCallback(async () => {
    setIsLoading(true);
    const res = await fetch(`/api/ai/${sessionId}/question`, { method: "POST" });
    const data = await res.json();

    if (data.done) {
      onPhaseComplete();
      return;
    }

    setCurrentQuestion(data.question);

    // Play TTS audio if available
    if (data.audio) {
      const audioBytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
      const blob = new Blob([audioBytes], { type: "audio/mpeg" });
      const audio = new Audio(URL.createObjectURL(blob));
      audio.play().catch(() => {});
    }

    setIsLoading(false);
  }, [sessionId, onPhaseComplete]);

  async function submitAnswer() {
    if (!transcript.trim() || !currentQuestion) return;

    setIsLoading(true);

    setQaHistory((prev) => [
      ...prev,
      { question: currentQuestion, answer: transcript },
    ]);

    const res = await fetch(`/api/ai/${sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const data = await res.json();

    setTranscript("");
    setCurrentQuestion(null);

    if (data.eval === "done") {
      onPhaseComplete();
    } else if (data.eval === "probe" && data.followUp) {
      setCurrentQuestion(data.followUp);
    } else {
      await fetchQuestion();
    }

    setIsLoading(false);
  }

  // Auto-fetch first question
  if (!currentQuestion && qaHistory.length === 0 && !isLoading) {
    fetchQuestion();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <div className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center mb-3">
          <span className="text-2xl">AI</span>
        </div>
        <h2 className="font-semibold capitalize">{phase} Phase</h2>
      </div>

      {/* Q&A history */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {qaHistory.map((qa, i) => (
          <div key={i} className="space-y-2">
            <p className="text-sm font-medium">{qa.question}</p>
            {qa.answer && (
              <p className="text-sm text-foreground/60 pl-3 border-l-2 border-foreground/10">
                {qa.answer}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Current question */}
      {currentQuestion && (
        <div className="border-t border-foreground/10 pt-4">
          <p className="text-sm font-medium mb-3">{currentQuestion}</p>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Type your answer..."
            className="w-full p-3 border border-foreground/15 rounded-lg bg-background text-sm resize-none h-24 focus:outline-none focus:border-foreground/30"
          />

          <div className="flex gap-2 mt-2">
            <button
              onClick={submitAnswer}
              disabled={!transcript.trim() || isLoading}
              className="px-4 py-2 bg-foreground text-background text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? "..." : "Submit Answer"}
            </button>
          </div>
        </div>
      )}

      {isLoading && !currentQuestion && (
        <div className="flex items-center gap-2 text-foreground/40 text-sm">
          <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          Thinking...
        </div>
      )}
    </div>
  );
}
