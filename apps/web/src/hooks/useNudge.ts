"use client";

import { useEffect, useState, useCallback } from "react";

const CHECK_INTERVAL = 60_000; // check every 60s

interface NudgeState {
  message: string | null;
  dismiss: () => void;
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
          const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
          const blob = new Blob([bytes], { type: "audio/mpeg" });
          const audio = new Audio(URL.createObjectURL(blob));
          audio.play().catch(() => {});
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
