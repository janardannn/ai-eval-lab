"use client";

import { useEffect } from "react";

const INTERVAL = 30_000; // 30 seconds

export function useHeartbeat(sessionId: string) {
  useEffect(() => {
    const beat = () => {
      fetch(`/api/session/${sessionId}/heartbeat`, { method: "POST" }).catch(
        () => {}
      );
    };

    beat(); // immediate first beat
    const interval = setInterval(beat, INTERVAL);
    return () => clearInterval(interval);
  }, [sessionId]);
}
