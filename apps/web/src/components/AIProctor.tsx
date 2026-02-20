"use client";

import { useState, useCallback, useRef, useEffect } from "react";

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
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [qaHistory, currentQuestion]);

  function playAudio(base64: string) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "audio/mpeg" });
    const audio = new Audio(URL.createObjectURL(blob));
    audio.play().catch(() => {});
  }

  const fetchQuestion = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ai/${sessionId}/question`, { method: "POST" });
      const data = await res.json();

      if (data.done) {
        onPhaseComplete();
        return;
      }

      setCurrentQuestion(data.question);
      if (data.audio) playAudio(data.audio);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, onPhaseComplete]);

  useEffect(() => {
    if (!hasStarted) {
      setHasStarted(true);
      fetchQuestion();
    }
  }, [hasStarted, fetchQuestion]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      // Mic access denied — user can still type
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    return new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        recorder.stream.getTracks().forEach((t) => t.stop());
        resolve(blob);
      };
      recorder.stop();
      setIsRecording(false);
    });
  }

  async function handleSubmitAudio() {
    if (!currentQuestion) return;
    const blob = await stopRecording();
    if (!blob) return;

    setIsLoading(true);
    setQaHistory((prev) => [...prev, { question: currentQuestion, answer: "(audio)" }]);
    setCurrentQuestion(null);

    const res = await fetch(`/api/ai/${sessionId}/answer`, {
      method: "POST",
      body: blob,
    });
    const data = await res.json();

    // Update the last QA entry with the actual transcript if server returns it
    handleAnswerResponse(data);
    setIsLoading(false);
  }

  async function handleSubmitText() {
    if (!transcript.trim() || !currentQuestion) return;

    setIsLoading(true);
    setQaHistory((prev) => [...prev, { question: currentQuestion, answer: transcript }]);
    setTranscript("");
    setCurrentQuestion(null);

    const res = await fetch(`/api/ai/${sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const data = await res.json();

    handleAnswerResponse(data);
    setIsLoading(false);
  }

  function handleAnswerResponse(data: {
    eval: string;
    followUp?: string;
    audio?: string;
    nextPhase?: string;
  }) {
    if (data.eval === "done") {
      onPhaseComplete();
    } else if (data.eval === "probe" && data.followUp) {
      setCurrentQuestion(data.followUp);
      if (data.audio) playAudio(data.audio);
    } else {
      fetchQuestion();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold capitalize">{phase} Phase</h2>
          <p className="text-xs text-foreground/40">AI Proctor</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4">
        {qaHistory.map((qa, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex gap-2">
              <span className="text-xs text-foreground/30 mt-0.5 shrink-0">Q</span>
              <p className="text-sm">{qa.question}</p>
            </div>
            {qa.answer && (
              <div className="flex gap-2 pl-4">
                <span className="text-xs text-foreground/30 mt-0.5 shrink-0">A</span>
                <p className="text-sm text-foreground/60">{qa.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {currentQuestion && (
        <div className="border-t border-foreground/10 pt-3">
          <p className="text-sm font-medium mb-3">{currentQuestion}</p>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmitText();
              }
            }}
            placeholder="Type your answer or use the mic..."
            className="w-full p-2.5 border border-foreground/15 rounded-lg bg-background text-sm resize-none h-20 focus:outline-none focus:border-foreground/30"
          />

          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSubmitText}
              disabled={!transcript.trim() || isLoading}
              className="px-3 py-1.5 bg-foreground text-background text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              Send
            </button>

            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isLoading}
                className="px-3 py-1.5 border border-foreground/15 text-sm rounded-lg hover:bg-foreground/5 disabled:opacity-50 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
                Record
              </button>
            ) : (
              <button
                onClick={handleSubmitAudio}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1.5 animate-pulse"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Stop & Send
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading && !currentQuestion && (
        <div className="flex items-center gap-2 text-foreground/40 text-sm pt-3">
          <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground/60 rounded-full animate-spin" />
          Thinking...
        </div>
      )}
    </div>
  );
}
