"use client";

import { useEffect, useState } from "react";

interface TimerProps {
  seconds: number;
  onTimeUp: () => void;
}

export function Timer({ seconds, onTimeUp }: TimerProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onTimeUp();
      return;
    }

    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onTimeUp]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isLow = remaining < 300;

  return (
    <span className={`font-mono text-sm ${isLow ? "text-red-500" : "text-foreground/60"}`}>
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </span>
  );
}
