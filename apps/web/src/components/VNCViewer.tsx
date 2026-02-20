"use client";

interface VNCViewerProps {
  url: string;
}

export function VNCViewer({ url }: VNCViewerProps) {
  return (
    <iframe
      src={url}
      className="w-full h-full border-0"
      allow="clipboard-read; clipboard-write"
    />
  );
}
