import { useRef, useEffect } from "react";

interface WaveformVisualizerProps {
  audioData: Uint8Array;
}

export function WaveformVisualizer({ audioData }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const bufferLength = audioData.length;
      const sliceWidth = width / bufferLength;

      // Clear the canvas
      ctx.fillStyle = "hsl(220 90% 4%)";
      ctx.fillRect(0, 0, width, height);

      // Set up the line style
      ctx.lineWidth = 2;
      ctx.strokeStyle = "hsl(220 90% 56%)";
      ctx.beginPath();

      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        // Scale the amplitude while maintaining center position
        const normalizedValue = audioData[i] / 128.0 - 1; // Center at 0
        const amplitudeScale = 2; // Increase this value to make waves bigger
        const y = (height / 2) * (1 + normalizedValue * amplitudeScale);

        // Ensure y stays within canvas bounds
        const clampedY = Math.max(0, Math.min(height, y));

        if (i === 0) {
          ctx.moveTo(x, clampedY);
        } else {
          ctx.lineTo(x, clampedY);
        }
        x += sliceWidth;
      }

      // Complete the path and stroke
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();
  }, [audioData]);

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={300}
      className="w-full h-full rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ imageRendering: "crisp-edges" }}
    />
  );
}
