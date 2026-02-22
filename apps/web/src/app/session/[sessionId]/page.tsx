"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Timer } from "@/components/Timer";
import { AIProctor } from "@/components/AIProctor";
import { VNCViewer } from "@/components/VNCViewer";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { useNudge } from "@/hooks/useNudge";

interface SessionStatus {
  phase: string;
  status: string;
  containerUrl?: string;
  timeLimit?: number;
  taskDescription?: string;
  hasReferenceMaterial?: boolean;
}

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useHeartbeat(sessionId);
  const nudge = useNudge(sessionId, session?.phase === "lab");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}/status`);
      if (!res.ok) {
        setError("Failed to load session. Please refresh.");
        return;
      }
      const data = await res.json();
      setSession(data);
      setError(null);

      if (data.phase === "grading" || data.phase === "graded") {
        router.push(`/session/${sessionId}/verdict`);
      }
    } catch {
      setError("Lost connection to server.");
    }
  }, [sessionId, router]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await fetch(`/api/session/${sessionId}/end`, { method: "POST" });
      router.push(`/session/${sessionId}/verdict`);
    } catch {
      setError("Failed to submit. Please try again.");
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="h-11 px-6 text-sm font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent-hover shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-150 active:scale-[0.98]"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
      </main>
    );
  }

  if (session.phase === "intro") {
    return (
      <main>
        <div className="max-w-2xl mx-auto px-6 py-20">
          <AIProctor sessionId={sessionId} phase="intro" onPhaseComplete={fetchStatus} />
        </div>
      </main>
    );
  }

  if (session.phase === "domain") {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex">
        <div className={`${session.hasReferenceMaterial ? "w-1/2" : "w-[70%]"} p-6 ring-1 ring-border`}>
          <AIProctor sessionId={sessionId} phase="domain" onPhaseComplete={fetchStatus} />
        </div>
        <div className={`${session.hasReferenceMaterial ? "w-1/2" : "w-[30%]"} p-6 flex items-center justify-center bg-muted/50`}>
          <p className="text-muted-foreground">Reference materials will appear here</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="h-12 ring-1 ring-border bg-card flex items-center justify-between px-4 shrink-0">
        <span className="text-sm font-semibold tracking-tight">Lab Session</span>
        <Timer seconds={session.timeLimit || 1800} onTimeUp={handleSubmit} />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="h-8 px-4 text-sm font-medium rounded-md bg-destructive text-white hover:brightness-110 transition-all duration-75 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-[30%] p-4 ring-1 ring-border bg-card/50 overflow-y-auto">
          {nudge.message && (
            <div className="mb-4 p-3 rounded-md ring-1 ring-yellow-500/20 bg-yellow-500/10">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-yellow-600 dark:text-yellow-300">{nudge.message}</p>
                <button
                  onClick={nudge.dismiss}
                  className="text-yellow-500/50 hover:text-yellow-500 text-xs shrink-0"
                >
                  dismiss
                </button>
              </div>
            </div>
          )}
          {session.taskDescription && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2">Task</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {session.taskDescription}
              </p>
            </div>
          )}
          <AIProctor sessionId={sessionId} phase="lab" onPhaseComplete={fetchStatus} />
        </div>
        <div className="w-[70%]">
          {session.containerUrl ? (
            <VNCViewer url={`${session.containerUrl}/vnc.html`} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Waiting for container...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
