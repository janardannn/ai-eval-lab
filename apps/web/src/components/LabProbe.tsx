"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useProbe } from "@/hooks/useProbe";
import type { AudioRecorderState } from "@/hooks/useAudioRecorder";

interface LabProbeProps {
  sessionId: string;
  recorder: AudioRecorderState;
}

let probeCtx: AudioContext | null = null;
let probeSource: AudioBufferSourceNode | null = null;

function stopProbeAudio() {
  if (probeSource) {
    try { probeSource.stop(); } catch {}
    probeSource = null;
  }
}

async function playProbeAudio(base64Wav: string) {
  if (typeof window === "undefined") return;
  stopProbeAudio();
  if (!probeCtx) probeCtx = new AudioContext();
  if (probeCtx.state === "suspended") await probeCtx.resume();

  const binary = atob(base64Wav);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  try {
    const decoded = await probeCtx.decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer);
    stopProbeAudio();
    const source = probeCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(probeCtx.destination);
    source.onended = () => { probeSource = null; };
    probeSource = source;
    source.start();
  } catch (err) {
    console.error("[TTS] probe audio decode failed:", err);
  }
}

export function LabProbe({ sessionId, recorder }: LabProbeProps) {
  const probe = useProbe(sessionId, true);
  const [transcript, setTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const busyRef = useRef(false);

  // Play TTS when a new probe question arrives
  useEffect(() => {
    if (probe.status === "pending" && probe.audioBase64) {
      playProbeAudio(probe.audioBase64);
    }
  }, [probe.status, probe.audioBase64]);

  // Sync live STT transcript while recording
  useEffect(() => {
    if (recorder.isRecording && recorder.liveTranscript) {
      setTranscript(recorder.liveTranscript);
    }
  }, [recorder.isRecording, recorder.liveTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopProbeAudio(); };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    stopProbeAudio();
    setSubmitting(true);

    try {
      let body: BodyInit;
      let headers: HeadersInit | undefined;

      if (recorder.isRecordingRef.current && recorder.mediaRecorderRef.current?.state === "recording") {
        const blob = await recorder.stopRecording();
        if (blob) {
          body = blob;
        } else {
          headers = { "Content-Type": "application/json" };
          body = JSON.stringify({ transcript: transcript || "(no response)" });
        }
      } else {
        headers = { "Content-Type": "application/json" };
        body = JSON.stringify({ transcript: transcript || "(no response)" });
      }

      await fetch(`/api/ai/${sessionId}/answer`, { method: "POST", headers, body });
    } finally {
      setSubmitting(false);
      busyRef.current = false;
      setTranscript("");
      probe.markAnswered();
    }
  }, [sessionId, recorder, transcript, probe]);

  // Idle state
  if (probe.status === "idle") {
    return (
      <div className="flex items-center gap-2 py-3">
        <div className="w-2 h-2 rounded-full bg-accent/50 animate-pulse" />
        <p className="text-xs text-muted-foreground">AI proctor is observing your work...</p>
      </div>
    );
  }

  // Pending state — probe question arrived
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-md ring-1 ring-accent/30 bg-accent/5">
        <div className="flex items-start gap-2 mb-2">
          <svg className="w-4 h-4 text-accent shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium leading-relaxed">{probe.question}</p>
        </div>
      </div>

      <textarea
        value={transcript}
        readOnly
        disabled={submitting}
        placeholder={recorder.isRecording ? "Listening..." : "Press record to answer..."}
        className="w-full p-2.5 ring-1 ring-border rounded-md bg-muted text-xs resize-none h-16 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-default"
      />

      <div className="flex gap-2">
        {!recorder.isRecording ? (
          <button
            onClick={() => { stopProbeAudio(); setTranscript(""); recorder.startRecording(); }}
            disabled={submitting}
            className="flex-1 h-8 text-xs font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent-hover shadow-lg shadow-accent/25 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            Record
          </button>
        ) : (
          <>
            <button
              onClick={() => { setTranscript(""); recorder.resetRecording(); }}
              className="h-8 px-3 text-xs font-medium rounded-md ring-1 ring-border hover:bg-muted transition-all duration-75 active:scale-[0.98] flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Reset
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 h-8 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-all duration-75 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              {submitting ? "Sending..." : "Stop & Send"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
