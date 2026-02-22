"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartExamButton({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });

      if (res.status === 401) {
        router.push(`/login?callbackUrl=/lab/kicad/${assessmentId}`);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to start exam. Please try again.");
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.status === "ready") {
        router.push(`/session/${data.sessionId}`);
      } else {
        router.push(`/queue/${data.sessionId}`);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleStart}
        disabled={loading}
        className="h-12 px-8 text-base font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent-hover shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
      >
        {loading ? "Starting..." : "Start Exam"}
      </button>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  );
}
