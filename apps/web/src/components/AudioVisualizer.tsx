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

    const barCount = 40;
    const prevHeights = new Float32Array(barCount).fill(0);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      analyser!.getByteFrequencyData(dataArray);

      const w = canvas!.width;
      const h = canvas!.height;
      const centerY = h / 2;
      ctx!.clearRect(0, 0, w, h);

      const gap = 2.5;
      const barWidth = (w - gap * (barCount - 1)) / barCount;

      for (let i = 0; i < barCount; i++) {
        // Map bar index to frequency bin — weight toward lower frequencies
        const binIndex = Math.floor((i / barCount) * (dataArray.length * 0.7));
        const raw = dataArray[binIndex] / 255;

        // Smooth with previous frame for fluid motion
        const target = Math.max(0.04, raw);
        prevHeights[i] += (target - prevHeights[i]) * 0.3;
        const value = prevHeights[i];

        const barHeight = Math.max(2, value * (h * 0.85));
        const halfBar = barHeight / 2;

        const x = i * (barWidth + gap);

        // Gradient intensity based on value
        const alpha = 0.35 + value * 0.65;
        ctx!.fillStyle = `rgba(99, 153, 255, ${alpha})`;

        // Draw mirrored from center
        ctx!.beginPath();
        ctx!.roundRect(x, centerY - halfBar, barWidth, barHeight, barWidth / 2);
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
      width={400}
      height={64}
      className="w-full h-16"
    />
  );
}
