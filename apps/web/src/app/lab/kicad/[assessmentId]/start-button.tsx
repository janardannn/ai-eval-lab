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
        className="px-6 py-3 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "Starting..." : "Start Exam"}
      </button>
      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
