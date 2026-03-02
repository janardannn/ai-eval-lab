"use client";

import { useRef, useEffect } from "react";

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
}

export function AudioVisualizer({ analyser }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      analyser!.getByteFrequencyData(dataArray);

      const w = canvas!.width;
      const h = canvas!.height;
      ctx!.clearRect(0, 0, w, h);

      const barCount = Math.min(bufferLength, 24);
      const gap = 3;
      const barWidth = (w - gap * (barCount - 1)) / barCount;

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i] / 255;
        const barHeight = Math.max(3, value * h);

        const x = i * (barWidth + gap);
        const y = (h - barHeight) / 2;

        // Accent blue with opacity based on intensity
        ctx!.fillStyle = `rgba(59, 130, 246, ${0.3 + value * 0.7})`;
        ctx!.beginPath();
        ctx!.roundRect(x, y, barWidth, barHeight, 2);
        ctx!.fill();
      }
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser]);

  if (!analyser) return null;

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={48}
      className="w-full h-12"
    />
  );
}
