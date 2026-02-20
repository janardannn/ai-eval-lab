"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Timer } from "@/components/Timer";
import { AIProctor } from "@/components/AIProctor";
import { VNCViewer } from "@/components/VNCViewer";
import { useHeartbeat } from "@/hooks/useHeartbeat";

interface SessionStatus {
  phase: string;
  status: string;
  containerUrl?: string;
  timeLimit?: number;
  taskDescription?: string;
}

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionStatus | null>(null);

  useHeartbeat(sessionId);

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/session/${sessionId}/status`);
    const data = await res.json();
    setSession(data);

    if (data.phase === "grading" || data.phase === "graded") {
      router.push(`/session/${sessionId}/verdict`);
    }
  }, [sessionId, router]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function handleSubmit() {
    await fetch(`/api/session/${sessionId}/end`, { method: "POST" });
    router.push(`/session/${sessionId}/verdict`);
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </main>
    );
  }

  if (session.phase === "intro") {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <AIProctor sessionId={sessionId} phase="intro" onPhaseComplete={fetchStatus} />
        </div>
      </main>
    );
  }

  if (session.phase === "domain") {
    return (
      <main className="min-h-screen bg-background flex">
        <div className="w-1/2 p-6 border-r border-foreground/10">
          <AIProctor sessionId={sessionId} phase="domain" onPhaseComplete={fetchStatus} />
        </div>
        <div className="w-1/2 p-6 flex items-center justify-center">
          <p className="text-foreground/40">Reference materials will appear here</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen bg-background flex flex-col">
      <div className="h-12 border-b border-foreground/10 flex items-center justify-between px-4 shrink-0">
        <span className="text-sm font-medium">Lab Session</span>
        <Timer seconds={session.timeLimit || 1800} onTimeUp={handleSubmit} />
        <button
          onClick={handleSubmit}
          className="px-4 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
        >
          Submit
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-[30%] p-4 border-r border-foreground/10 overflow-y-auto">
          {session.taskDescription && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2">Task</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">
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
              <p className="text-foreground/40">Waiting for container...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
