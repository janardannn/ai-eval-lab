"use client";

interface VNCViewerProps {
  url: string;
}

const VNC_PARAMS = "autoconnect=true&resize=scale&quality=7&compression=2&shared=true&reconnect=true&reconnect_delay=1000";

export function VNCViewer({ url }: VNCViewerProps) {
  const autoUrl = url.includes("?")
    ? `${url}&${VNC_PARAMS}`
    : `${url}?${VNC_PARAMS}`;

  return (
    <iframe
      src={autoUrl}
      className="w-full h-full border-0"
      allow="clipboard-read; clipboard-write"
    />
  );
}
