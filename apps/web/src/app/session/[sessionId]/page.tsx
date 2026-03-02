"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Timer } from "@/components/Timer";
import { AIProctor } from "@/components/AIProctor";
import { VNCViewer } from "@/components/VNCViewer";
import { WebcamPreview } from "@/components/WebcamPreview";
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
  const [submitting, setSubmitting] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraRequested = useRef(false);

  const stopCamera = useCallback(() => {
    setCameraStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop());
      return null;
    });
  }, []);

  useEffect(() => {
    if (cameraRequested.current) return;
    cameraRequested.current = true;
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(setCameraStream)
      .catch(() => {});
    return stopCamera;
  }, [stopCamera]);

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
        stopCamera();
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

  async function handleEndExam() {
    setSubmitting(true);
    stopCamera();
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
      <main className="min-h-[calc(100vh-4rem)] flex">
        <div className="w-[30%] p-6 ring-1 ring-border bg-card/50 flex flex-col items-center pt-12">
          <WebcamPreview stream={cameraStream} />
          <p className="text-xs text-muted-foreground/50 mt-3">Camera preview</p>
        </div>
        <div className="w-[70%] p-6 flex items-center">
          <div className="max-w-xl mx-auto w-full">
            <AIProctor key="intro" sessionId={sessionId} phase="intro" onPhaseComplete={fetchStatus} onEndExam={handleEndExam} />
          </div>
        </div>
      </main>
    );
  }

  if (session.phase === "domain") {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex">
        <div className="w-[30%] p-6 ring-1 ring-border bg-card/50 flex flex-col items-center pt-12">
          <WebcamPreview stream={cameraStream} />
          <p className="text-xs text-muted-foreground/50 mt-3">Camera preview</p>
        </div>
        <div className="w-[70%] p-6 ring-1 ring-border">
          <AIProctor key="domain" sessionId={sessionId} phase="domain" onPhaseComplete={fetchStatus} onEndExam={handleEndExam} />
        </div>
        {/* TODO: reference materials pane — think of feasibility later
        <div className={`${session.hasReferenceMaterial ? "w-1/2" : "w-[30%]"} p-6 flex items-center justify-center bg-muted/50 ring-1 ring-border`}>
          <p className="text-muted-foreground">Reference materials will appear here</p>
        </div>
        */}
      </main>
    );
  }

  return (
    <main className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="h-12 ring-1 ring-border bg-card flex items-center justify-between px-4 shrink-0">
        <span className="text-sm font-semibold tracking-tight">Lab Session</span>
        <Timer seconds={session.timeLimit || 1800} onTimeUp={handleEndExam} />
        <button
          onClick={() => setShowEndConfirm(true)}
          disabled={submitting}
          className="h-8 px-4 text-sm font-medium rounded-md bg-destructive text-white hover:brightness-110 transition-all duration-75 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>

      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card ring-1 ring-border rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Submit & End Exam?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This will end your lab session and submit your work for grading. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="h-9 px-4 text-sm font-medium rounded-md ring-1 ring-border hover:bg-muted transition-all duration-75 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowEndConfirm(false);
                  handleEndExam();
                }}
                className="h-9 px-4 text-sm font-medium rounded-md bg-destructive text-white hover:brightness-110 transition-all duration-75 active:scale-[0.98]"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className="w-[30%] p-4 ring-1 ring-border bg-card/50 overflow-y-auto">
          <div className="mb-4">
            <WebcamPreview stream={cameraStream} compact />
          </div>
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
          <AIProctor key="lab" sessionId={sessionId} phase="lab" onPhaseComplete={fetchStatus} />
        </div>
        <div className="w-[70%]">
          {submitting ? (
            <div className="flex items-center justify-center h-full gap-3">
              <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
              <p className="text-muted-foreground">Submitting your work...</p>
            </div>
          ) : session.containerUrl ? (
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
