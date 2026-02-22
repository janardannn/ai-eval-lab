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
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(data.message);
          setTimeout(() => window.speechSynthesis.speak(utterance), 1000);
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
