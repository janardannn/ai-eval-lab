"use client";

import { useRef, useEffect } from "react";

interface WebcamPreviewProps {
  stream: MediaStream | null;
  compact?: boolean;
}

export function WebcamPreview({ stream, compact }: WebcamPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return (
      <div className={`${compact ? "aspect-video" : "aspect-[4/3]"} w-full rounded-lg ring-1 ring-border bg-muted/50 flex items-center justify-center`}>
        <div className="text-center">
          <svg className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <p className="text-xs text-muted-foreground/50">Camera off</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${compact ? "aspect-video" : "aspect-[4/3]"} w-full rounded-lg ring-1 ring-border overflow-hidden bg-black relative`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover scale-x-[-1]"
      />
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[10px] text-white/80 font-medium">LIVE</span>
      </div>
    </div>
  );
}
