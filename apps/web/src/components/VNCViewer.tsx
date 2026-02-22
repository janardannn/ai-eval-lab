"use client";

interface VNCViewerProps {
  url: string;
}

export function VNCViewer({ url }: VNCViewerProps) {
  const autoUrl = url.includes("?")
    ? `${url}&autoconnect=true&resize=scale`
    : `${url}?autoconnect=true&resize=scale`;

  return (
    <iframe
      src={autoUrl}
      className="w-full h-full border-0"
      allow="clipboard-read; clipboard-write"
    />
  );
}
