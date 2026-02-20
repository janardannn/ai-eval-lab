"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartExamButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);

    const res = await fetch("/api/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });

    if (res.status === 401) {
      router.push(`/login?callbackUrl=/lab/kicad/${taskId}`);
      return;
    }

    const data = await res.json();

    if (data.status === "ready") {
      router.push(`/session/${data.sessionId}`);
    } else {
      router.push(`/queue/${data.sessionId}`);
    }
  }

  return (
    <button
      onClick={handleStart}
      disabled={loading}
      className="px-6 py-3 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {loading ? "Starting..." : "Start Exam"}
    </button>
  );
}
