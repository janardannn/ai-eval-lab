"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { AudioRecorderState } from "@/hooks/useAudioRecorder";

interface AIProctorProps {
  sessionId: string;
  phase: "intro" | "domain" | "lab";
  onPhaseComplete: () => void | Promise<void>;
  recorder?: AudioRecorderState;
}

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

function stopAudio() {
  if (currentSource) {
    try { currentSource.stop(); } catch {}
    currentSource = null;
  }
}

function playAudioDelayed(base64Wav: string) {
  if (typeof window === "undefined") return;
  stopAudio();
  if (!audioCtx) audioCtx = new AudioContext();

  const binary = atob(base64Wav);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  audioCtx.decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer).then((decoded) => {
    stopAudio();
    const source = audioCtx!.createBufferSource();
    source.buffer = decoded;
    source.connect(audioCtx!.destination);
    source.onended = () => { currentSource = null; };
    currentSource = source;
    source.start(audioCtx!.currentTime + 1);
  }).catch((err) => {
    console.error("[TTS] AudioContext decode failed:", err);
  });
}

export function AIProctor({ sessionId, phase, onPhaseComplete, recorder }: AIProctorProps) {
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [readingTimeLeft, setReadingTimeLeft] = useState(0);
  const questionTimeLimitRef = useRef(0);
  const readingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(false);
  const aliveRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      stopAudio();
      if (timerRef.current) clearInterval(timerRef.current);
      if (readingTimerRef.current) clearInterval(readingTimerRef.current);
    };
  }, []);

  function startAnswerCountdown(seconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setQuestionTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function startQuestionTimer(seconds: number, questionText: string) {
    if (timerRef.current) clearInterval(timerRef.current);
    if (readingTimerRef.current) clearInterval(readingTimerRef.current);
    questionTimeLimitRef.current = seconds;
    if (seconds <= 0) { setQuestionTimeLeft(0); setReadingTimeLeft(0); return; }

    const readSec = Math.min(15, Math.max(5, Math.round(questionText.length / 12)));
    setReadingTimeLeft(readSec);
    setQuestionTimeLeft(seconds);

    readingTimerRef.current = setInterval(() => {
      setReadingTimeLeft((prev) => {
        if (prev <= 1) {
          if (readingTimerRef.current) clearInterval(readingTimerRef.current);
          readingTimerRef.current = null;
          startAnswerCountdown(seconds);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const fetchQuestion = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ai/${sessionId}/question`, { method: "POST" });
      const data = await res.json();

      if (data.done) {
        await onPhaseComplete();
        return;
      }

      if (!aliveRef.current) return;
      setCurrentQuestion(data.question);
      setTranscript("");
      startQuestionTimer(data.timeLimit || 0, data.question);
      if (data.audio) playAudioDelayed(data.audio);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [sessionId, onPhaseComplete]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchQuestion();
    }
  }, [fetchQuestion]);

  // Auto-submit when per-question timer expires
  useEffect(() => {
    if (questionTimeLeft !== 0 || questionTimeLimitRef.current <= 0 || busyRef.current || !currentQuestion) return;

    async function autoSubmit() {
      if (busyRef.current) return;
      busyRef.current = true;
      stopAudio();
      setIsLoading(true);

      try {
        let body: BodyInit;
        let headers: HeadersInit | undefined;

        if (recorder?.isRecordingRef.current && recorder.mediaRecorderRef.current?.state === "recording") {
          const blob = await recorder.stopRecording();
          if (blob) {
            body = blob;
          } else {
            headers = { "Content-Type": "application/json" };
            body = JSON.stringify({ transcript: transcript || "(no response — time expired)" });
          }
        } else {
          headers = { "Content-Type": "application/json" };
          body = JSON.stringify({ transcript: transcript || "(no response — time expired)" });
        }

        const res = await fetch(`/api/ai/${sessionId}/answer`, { method: "POST", headers, body });
        const data = await res.json();
        if (aliveRef.current) await handleAnswerResponse(data);
      } finally {
        setIsLoading(false);
        busyRef.current = false;
        setTranscript("");
      }
    }

    autoSubmit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionTimeLeft]);

  async function handleSubmitVoice() {
    if (!currentQuestion || busyRef.current || !recorder) return;
    busyRef.current = true;
    stopAudio();
    const blob = await recorder.stopRecording();
    if (!blob) { busyRef.current = false; return; }

    setIsLoading(true);
    setTranscript("");
    try {
      const res = await fetch(`/api/ai/${sessionId}/answer`, {
        method: "POST",
        body: blob,
      });
      const data = await res.json();
      await handleAnswerResponse(data);
    } finally {
      setIsLoading(false);
      busyRef.current = false;
    }
  }

  async function handleAnswerResponse(data: { eval: string; nextPhase?: string }) {
    if (!aliveRef.current) return;
    if (data.eval === "done") {
      await onPhaseComplete();
    } else {
      await fetchQuestion();
    }
  }

  // Sync live STT transcript into textarea while recording
  useEffect(() => {
    if (recorder?.isRecording && recorder.liveTranscript) {
      setTranscript(recorder.liveTranscript);
    }
  }, [recorder?.isRecording, recorder?.liveTranscript]);

  const handleExternalAudioSubmit = recorder ? handleSubmitVoice : undefined;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md ring-1 ring-accent/20 bg-accent/10 flex items-center justify-center shrink-0">
            {phase === "intro" ? (
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            ) : phase === "domain" ? (
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {phase === "intro" ? "Introduction" : phase === "domain" ? "Domain Viva" : "Hands-on Lab"}
            </h2>
          </div>
        </div>
      </div>

      {currentQuestion && (
        <div className="flex-1 flex flex-col justify-center mb-4">
          <div className="relative">
            {questionTimeLimitRef.current > 0 && (
              readingTimeLeft > 0 ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ring-1 ring-accent/30 bg-accent/10 text-accent text-xs font-mono font-semibold mb-3">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Read — {readingTimeLeft}s
                </div>
              ) : (
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ring-1 text-xs font-mono font-semibold mb-3 ${
                  questionTimeLeft <= 10
                    ? "ring-red-500/30 bg-red-500/10 text-red-400 animate-pulse"
                    : questionTimeLeft <= 30
                      ? "ring-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                      : "ring-border bg-muted text-muted-foreground"
                }`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {String(Math.floor(questionTimeLeft / 60)).padStart(2, "0")}:{String(questionTimeLeft % 60).padStart(2, "0")}
                </div>
              )
            )}
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
            readOnly
            disabled={isLoading || readingTimeLeft > 0}
            placeholder={readingTimeLeft > 0 ? "Read the question first..." : recorder?.isRecording ? "Listening..." : "Press record to answer..."}
            className="w-full p-3 ring-1 ring-border rounded-md bg-muted text-sm resize-none h-24 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-default"
          />

          {recorder && (
            <div className="flex gap-3 mt-3">
              {!recorder.isRecording ? (
                <button
                  onClick={() => { stopAudio(); setTranscript(""); recorder.startRecording(); }}
                  disabled={isLoading || readingTimeLeft > 0}
                  className="h-9 px-4 text-sm font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent-hover shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                  Record Answer
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { setTranscript(""); recorder.resetRecording(); }}
                    className="h-9 px-4 text-sm font-medium rounded-md ring-1 ring-border hover:bg-muted transition-all duration-75 active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                    Reset
                  </button>
                  <button
                    onClick={handleExternalAudioSubmit}
                    className="h-9 px-4 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-all duration-75 active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                    Stop & Send
                  </button>
                </>
              )}
            </div>
          )}
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
