'use client';

import { useEffect, useRef } from 'react';

interface AirFlowVisualizerProps {
  direction?: 'left' | 'right';
  compact?: boolean;
}

export default function AirFlowVisualizer({ direction = 'right', compact = false }: AirFlowVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;
    let time = 0;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set up drawing style
      ctx.strokeStyle = 'rgb(86, 126, 245)';
      ctx.fillStyle = 'rgb(86, 126, 245)';
      ctx.lineWidth = 2.5;

      if (direction === 'right') {
        // Draw arrows pointing right
        for (let i = 0; i < 3; i++) {
          const offset = Math.sin(time * 0.01 + i * 0.5) * 2;
          const startY = 15 + i * 25;

          // Arrow line
          ctx.beginPath();
          ctx.moveTo(5 + offset, startY);
          ctx.lineTo(35 + offset, startY);
          ctx.stroke();

          // Arrow head
          ctx.beginPath();
          ctx.moveTo(35 + offset, startY);
          ctx.lineTo(28 + offset, startY - 5);
          ctx.lineTo(28 + offset, startY + 5);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Draw arrows pointing left
        for (let i = 0; i < 3; i++) {
          const offset = Math.sin(time * 0.01 + i * 0.5) * 2;
          const startY = 15 + i * 25;

          // Arrow line
          ctx.beginPath();
          ctx.moveTo(40 - offset, startY);
          ctx.lineTo(10 - offset, startY);
          ctx.stroke();

          // Arrow head
          ctx.beginPath();
          ctx.moveTo(10 - offset, startY);
          ctx.lineTo(17 - offset, startY - 5);
          ctx.lineTo(17 - offset, startY + 5);
          ctx.closePath();
          ctx.fill();
        }
      }

      time++;
      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationFrame);
  }, [direction]);

  return (
    <div className="flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={compact ? 38 : 50}
        height={compact ? 60 : 80}
        className={compact ? "h-14 w-9" : "h-20 w-12"}
        style={{ display: 'block' }}
      />
    </div>
  );
}
