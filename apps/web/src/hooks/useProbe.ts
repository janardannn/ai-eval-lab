"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const POLL_INTERVAL = 30_000; // poll every 30s, server controls actual spacing

export type ProbeStatus = "idle" | "pending";

interface ProbeState {
  status: ProbeStatus;
  question: string | null;
  audioBase64: string | null;
  markAnswered: () => void;
}

export function useProbe(sessionId: string, active: boolean): ProbeState {
  const [status, setStatus] = useState<ProbeStatus>("idle");
  const [question, setQuestion] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const checkProbe = useCallback(async () => {
    if (!active || status === "pending") return;
    try {
      const res = await fetch(`/api/ai/${sessionId}/probe`);
      const data = await res.json();
      if (!aliveRef.current) return;
      if (data.probe && data.question) {
        setQuestion(data.question);
        setAudioBase64(data.audio || null);
        setStatus("pending");
      }
    } catch {
      // probe check failed silently
    }
  }, [sessionId, active, status]);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  useEffect(() => {
    if (!active || status === "pending") return;
    const interval = setInterval(checkProbe, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkProbe, active, status]);

  const markAnswered = useCallback(() => {
    setStatus("idle");
    setQuestion(null);
    setAudioBase64(null);
  }, []);

  return { status, question, audioBase64, markAnswered };
}
