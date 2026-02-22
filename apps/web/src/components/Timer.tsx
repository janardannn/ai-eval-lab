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
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md ring-1 ${
        isLow
          ? "ring-red-200 bg-red-100 dark:ring-red-800 dark:bg-red-900/20"
          : "ring-border bg-muted"
      }`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span
        className={`font-mono text-sm font-semibold ${
          isLow ? "text-red-700 dark:text-red-400" : ""
        }`}
      >
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
    </div>
  );
}
