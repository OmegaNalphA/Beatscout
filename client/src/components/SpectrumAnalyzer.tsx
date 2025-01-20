import { useRef, useEffect } from "react";

interface SpectrumAnalyzerProps {
  frequencyData: Uint8Array;
}

export function SpectrumAnalyzer({ frequencyData }: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / frequencyData.length) * 2.5; // Adjust multiplier for bar width
      const barSpacing = 1; // Space between bars

      // Clear the canvas
      ctx.fillStyle = "hsl(220 90% 4%)";
      ctx.fillRect(0, 0, width, height);

      // Draw frequency bars
      frequencyData.forEach((value, index) => {
        // Only draw every nth bar to avoid overcrowding
        if (index % 2 !== 0) return;

        const x = index * (barWidth + barSpacing);
        const barHeight = (value / 255) * height;
        
        // Create gradient for bars
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, "hsl(220 90% 56%)");    // Primary color
        gradient.addColorStop(1, "hsl(220 90% 70%)");    // Lighter variant

        ctx.fillStyle = gradient;
        ctx.fillRect(
          x, 
          height - barHeight, 
          barWidth, 
          barHeight
        );
      });

      // Draw frequency labels
      ctx.fillStyle = "hsl(220 90% 70% / 0.5)";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      
      // Add some frequency markers
      const frequencies = ["20Hz", "100Hz", "1kHz", "10kHz", "20kHz"];
      const positions = [0, 0.2, 0.5, 0.8, 1];
      
      frequencies.forEach((freq, i) => {
        const x = width * positions[i];
        ctx.fillText(freq, x, height - 5);
      });
    };

    draw();
  }, [frequencyData]);

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={300}
      className="w-full h-full rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    />
  );
}
