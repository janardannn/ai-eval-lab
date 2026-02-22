"use client";

import { useEffect, useState, useCallback } from "react";

const CHECK_INTERVAL = 60_000; // check every 60s

interface NudgeState {
  message: string | null;
  dismiss: () => void;
}

function playNudgeAudio(base64: string) {
  try {
    const ctx = new AudioContext();
    const raw = atob(base64);
    const buf = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);

    ctx.decodeAudioData(buf.buffer.slice(0)).then((decoded) => {
      const src = ctx.createBufferSource();
      src.buffer = decoded;
      src.connect(ctx.destination);
      src.start(ctx.currentTime + 1);
    }).catch(() => {});
  } catch {
    // AudioContext not available
  }
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
        if (data.audio) {
          playNudgeAudio(data.audio);
        }
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
