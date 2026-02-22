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
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
      <div className="text-center w-full max-w-md">
        {error ? (
          <>
            <div className="w-14 h-14 rounded-lg ring-1 ring-destructive/20 bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <span className="text-destructive text-xl font-bold">!</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-3">
              Something went wrong
            </h1>
            <p className="text-muted-foreground mb-8">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="h-11 px-6 text-sm font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent-hover shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-150 active:scale-[0.98]"
            >
              Retry
            </button>
          </>
        ) : (
          <>
            <div className="relative w-20 h-20 mx-auto mb-10">
              <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
              <div className="absolute inset-3 rounded-full ring-2 ring-accent/50 animate-glow-pulse" />
              <div className="absolute inset-7 rounded-full bg-accent" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-3">
              Provisioning your lab...
            </h1>
            {position !== null && position >= 0 ? (
              <p className="text-muted-foreground">
                Queue position:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {position + 1}
                </span>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Setting up your environment
              </p>
            )}
            <p className="text-sm text-muted-foreground/50 mt-8">
              This usually takes 10-30 seconds
            </p>
          </>
        )}
      </div>
    </main>
  );
}
