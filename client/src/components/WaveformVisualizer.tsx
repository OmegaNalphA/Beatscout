import { useRef, useEffect } from 'react';

interface WaveformVisualizerProps {
  audioData: Uint8Array;
}

export function WaveformVisualizer({ audioData }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const bufferLength = audioData.length;
      const sliceWidth = width / bufferLength;

      ctx.fillStyle = 'hsl(220 90% 4%)';
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'hsl(220 90% 56%)';
      ctx.beginPath();

      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = audioData[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();
  }, [audioData]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={200}
      className="w-full h-full rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    />
  );
}
