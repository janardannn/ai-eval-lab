"use client";

import { useEffect, useState, useCallback } from "react";

const CHECK_INTERVAL = 60_000; // check every 60s

interface NudgeState {
  message: string | null;
  dismiss: () => void;
}

function playAudio(base64Wav: string) {
  if (typeof window === "undefined") return;
  const ctx = new AudioContext();
  const binary = atob(base64Wav);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  ctx.decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer).then((decoded) => {
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(ctx.destination);
    source.start(ctx.currentTime + 1);
  }).catch(() => {});
}

export function useNudge(sessionId: string, active: boolean): NudgeState {
  const [message, setMessage] = useState<string | null>(null);

  const checkNudge = useCallback(async () => {
    if (!active) return;
    try {
      const res = await fetch(`/api/ai/${sessionId}/nudge`);
      const data = await res.json();
      if (data.nudge && data.message) {
        setMessage(data.message);
        if (data.audio) playAudio(data.audio);
      }
    } catch {
      // nudge check failed silently
    }
  }, [sessionId, active]);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(checkNudge, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkNudge, active]);

  return {
    message,
    dismiss: () => setMessage(null),
  };
}
