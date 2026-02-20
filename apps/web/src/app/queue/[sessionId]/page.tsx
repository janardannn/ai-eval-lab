"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function QueuePage() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/session/${sessionId}/status`);
      const data = await res.json();

      if (data.status === "ready" || data.status === "active") {
        clearInterval(interval);
        router.push(`/session/${sessionId}`);
        return;
      }

      if (data.queuePosition !== undefined) {
        setPosition(data.queuePosition);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, router]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-2">Provisioning your lab...</h1>
        {position !== null && position >= 0 ? (
          <p className="text-foreground/60">
            Queue position: {position + 1}
          </p>
        ) : (
          <p className="text-foreground/60">Setting up your environment</p>
        )}
      </div>
    </main>
  );
}
