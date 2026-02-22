"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface AIProctorProps {
  sessionId: string;
  phase: "intro" | "domain" | "lab";
  onPhaseComplete: () => void;
  onEndExam?: () => void;
}

// Shared AudioContext — survives across component remounts.
// Created on first user interaction so the browser considers it "unlocked".
let sharedAudioCtx: AudioContext | null = null;

function ensureAudioContext() {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioContext();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

function playAudioDelayed(base64: string) {
  try {
    const ctx = ensureAudioContext();
    const raw = atob(base64);
    const buf = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);

    ctx.decodeAudioData(buf.buffer.slice(0)).then((decoded) => {
      const src = ctx.createBufferSource();
      src.buffer = decoded;
      src.connect(ctx.destination);
      // schedule 1 s after now — no setTimeout needed
      src.start(ctx.currentTime + 1);
    }).catch(() => {});
  } catch {
    // AudioContext not available
  }
}

export function AIProctor({ sessionId, phase, onPhaseComplete, onEndExam }: AIProctorProps) {
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pendingAudioRef = useRef<string | null>(null);

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
      // If AudioContext is already unlocked, play now. Otherwise stash for first click.
      if (data.audio) {
        if (sharedAudioCtx && sharedAudioCtx.state === "running") {
          playAudioDelayed(data.audio);
        } else {
          pendingAudioRef.current = data.audio;
        }
      }
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

  // Unlock AudioContext on any user interaction within this component
  function unlockAudio() {
    ensureAudioContext();
    // Play any audio that was stashed before unlock
    if (pendingAudioRef.current) {
      playAudioDelayed(pendingAudioRef.current);
      pendingAudioRef.current = null;
    }
  }

  async function startRecording() {
    unlockAudio();
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
      // Mic access denied
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
    if (!currentQuestion || isLoading) return;
    unlockAudio();
    const blob = await stopRecording();
    if (!blob) return;

    setIsLoading(true);

    const res = await fetch(`/api/ai/${sessionId}/answer`, {
      method: "POST",
      body: blob,
    });
    const data = await res.json();

    handleAnswerResponse(data);
    setIsLoading(false);
  }

  async function handleSubmitText() {
    if (!transcript.trim() || !currentQuestion || isLoading) return;
    unlockAudio();

    const answer = transcript;
    setIsLoading(true);
    setTranscript("");

    const res = await fetch(`/api/ai/${sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: answer }),
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
      if (data.audio) playAudioDelayed(data.audio);
    } else {
      fetchQuestion();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md ring-1 ring-accent/20 bg-accent/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold capitalize">{phase} Phase</h2>
            <p className="text-xs text-muted-foreground">AI Proctor</p>
          </div>
        </div>
        {onEndExam && (
          <button
            onClick={() => setShowEndConfirm(true)}
            className="h-8 px-3 text-xs font-medium rounded-md ring-1 ring-destructive/30 text-destructive hover:bg-destructive/10 transition-all duration-75 active:scale-[0.98]"
          >
            End Exam
          </button>
        )}
      </div>

      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card ring-1 ring-border rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">End Exam?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This will end your exam immediately. Your progress so far will be graded. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="h-9 px-4 text-sm font-medium rounded-md ring-1 ring-border hover:bg-muted transition-all duration-75 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowEndConfirm(false);
                  onEndExam?.();
                }}
                className="h-9 px-4 text-sm font-medium rounded-md bg-destructive text-white hover:brightness-110 transition-all duration-75 active:scale-[0.98]"
              >
                End Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {currentQuestion && (
        <div className="flex-1 flex flex-col justify-center mb-4">
          <div className="relative">
            <p className={`text-lg font-medium mb-8 leading-relaxed transition-opacity duration-200 ${isLoading ? "opacity-50" : ""}`}>
              {currentQuestion}
            </p>
            {isLoading && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmitText();
              }
            }}
            disabled={isLoading}
            placeholder="Type your answer or use the mic..."
            className="w-full p-3 ring-1 ring-border rounded-md bg-muted text-sm resize-none h-24 focus:outline-none focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <div className="flex gap-3 mt-3">
            <button
              onClick={handleSubmitText}
              disabled={!transcript.trim() || isLoading}
              className="h-9 px-4 text-sm font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent-hover shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              Send
            </button>

            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isLoading}
                className="h-9 px-4 text-sm font-medium rounded-md bg-muted ring-1 ring-border hover:bg-muted/80 transition-all duration-75 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
                Record
              </button>
            ) : (
              <button
                onClick={handleSubmitAudio}
                className="h-9 px-4 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-all duration-75 active:scale-[0.98] flex items-center gap-1.5 animate-pulse"
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
        <div className="flex items-center gap-2 text-muted-foreground text-sm pt-4">
          <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
          Thinking...
        </div>
      )}
    </div>
  );
}
