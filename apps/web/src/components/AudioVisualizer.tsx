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

    const barCount = 96;
    const prevHeights = new Float32Array(barCount).fill(0);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      analyser!.getByteFrequencyData(dataArray);

      const dpr = window.devicePixelRatio || 1;
      const w = canvas!.width / dpr;
      const h = canvas!.height / dpr;
      const centerY = h / 2;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);

      const gap = 1;
      const barWidth = (w - gap * (barCount - 1)) / barCount;
      const radius = Math.min(barWidth / 2, 1);

      for (let i = 0; i < barCount; i++) {
        // Distribute across lower 60% of spectrum where voice lives
        const t = i / barCount;
        const binIndex = Math.floor(t * t * dataArray.length * 0.6);
        const raw = dataArray[binIndex] / 255;

        // Ease toward target — slower decay, faster attack
        const target = Math.max(0.03, raw);
        const speed = target > prevHeights[i] ? 0.4 : 0.12;
        prevHeights[i] += (target - prevHeights[i]) * speed;
        const value = prevHeights[i];

        const maxHeight = h * 0.8;
        const barHeight = Math.max(1.5, value * maxHeight);
        const halfBar = barHeight / 2;

        const x = i * (barWidth + gap);

        const alpha = 0.25 + value * 0.75;
        ctx!.fillStyle = `rgba(99, 153, 255, ${alpha})`;

        ctx!.beginPath();
        ctx!.roundRect(x, centerY - halfBar, barWidth, barHeight, radius);
        ctx!.fill();
      }
    }

    // Handle DPR for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser]);

  if (!analyser) return null;

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-12"
    />
  );
}
