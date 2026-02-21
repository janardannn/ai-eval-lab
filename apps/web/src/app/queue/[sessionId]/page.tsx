"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

export default function QueuePage() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [position, setPosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const failCount = useRef(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}/status`);
        if (res.status === 404) {
          setError("This session has expired. Please start a new exam.");
          clearInterval(interval);
          return;
        }
        if (!res.ok) {
          failCount.current++;
          if (failCount.current > 10) {
            setError("Lost connection to server. Please refresh.");
            clearInterval(interval);
          }
          return;
        }

        failCount.current = 0;
        const data = await res.json();

        if (data.status === "ready" || data.status === "active") {
          clearInterval(interval);
          router.push(`/session/${sessionId}`);
          return;
        }

        if (data.error) {
          setError(data.error);
          clearInterval(interval);
          return;
        }

        if (data.queuePosition !== undefined) {
          setPosition(data.queuePosition);
        }
      } catch {
        failCount.current++;
        if (failCount.current > 10) {
          setError("Network error. Please check your connection.");
          clearInterval(interval);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, router]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center w-full max-w-md">
        {error ? (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-lg">!</span>
            </div>
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-foreground/60 text-sm mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-foreground text-background text-sm rounded hover:opacity-90"
            >
              Retry
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Provisioning your lab...</h1>
            {position !== null && position >= 0 ? (
              <p className="text-foreground/60">
                Queue position: {position + 1}
              </p>
            ) : (
              <p className="text-foreground/60">Setting up your environment</p>
            )}
            <p className="text-xs text-foreground/30 mt-4">This usually takes 10-30 seconds</p>
          </>
        )}
      </div>
    </main>
  );
}
