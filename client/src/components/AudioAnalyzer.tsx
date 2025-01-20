import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { SpectrumAnalyzer } from "./SpectrumAnalyzer";
import { BpmAnalyzer } from "./BpmAnalyzer";
import { KeyDetector } from "./KeyDetector";
import {
  AudioProcessor,
  calculateBPM,
  detectMusicalKey,
} from "@/lib/audioUtils";
import { useToast } from "@/hooks/use-toast";

export function AudioAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioProcessor] = useState(() => new AudioProcessor());
  const [timeData, setTimeData] = useState<Uint8Array>(
    new Uint8Array(1024).fill(128),
  );
  const [freqData, setFreqData] = useState<Uint8Array>(
    new Uint8Array(1024).fill(0),
  );
  const [bpm, setBpm] = useState(0);
  const [musicalKey, setMusicalKey] = useState("");
  const { toast } = useToast();

  const analyze = useCallback(() => {
    if (!isAnalyzing || !audioProcessor.isInitialized()) return;

    try {
      const timeData = audioProcessor.getTimeData();
      const freqData = audioProcessor.getFrequencyData();

      if (timeData.length > 0) {
        setTimeData(timeData);
      }
      if (freqData.length > 0) {
        setFreqData(freqData);
        setBpm(calculateBPM(freqData));
        setMusicalKey(detectMusicalKey(freqData));
      }
    } catch (error) {
      console.error("Analysis error:", error);
    }
  }, [isAnalyzing, audioProcessor]);

  useEffect(() => {
    let animationFrame: number;

    if (isAnalyzing) {
      const loop = () => {
        analyze();
        animationFrame = requestAnimationFrame(loop);
      };
      loop();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isAnalyzing, analyze]);

  const toggleAnalysis = async () => {
    try {
      if (!isAnalyzing) {
        await audioProcessor.initialize();
        setIsAnalyzing(true);
        toast({
          title: "Analysis Started",
          description: "Listening for audio input...",
        });
      } else {
        audioProcessor.cleanup();
        setIsAnalyzing(false);
        setTimeData(new Uint8Array(1024).fill(128));
        setFreqData(new Uint8Array(1024).fill(0));
        setBpm(0);
        setMusicalKey("");
        toast({
          title: "Analysis Stopped",
          description: "Audio input disconnected",
        });
      }
    } catch (error) {
      console.error("Toggle error:", error);
      toast({
        title: "Error",
        description: "Failed to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Visualization Section */}
      <div className="grid grid-cols-1">
        <div className="h-[8vh] rounded-lg overflow-hidden">
          <WaveformVisualizer audioData={timeData} />
        </div>
        <div className="h-[18vh] rounded-lg overflow-hidden">
          <SpectrumAnalyzer frequencyData={freqData} />
        </div>
      </div>

      {/* Analysis Cards */}
      <div className="grid grid-cols-1 gap-4">
        <div className="w-full">
          <BpmAnalyzer bpm={bpm} />
        </div>
        <div className="w-full">
          <KeyDetector musicalKey={musicalKey} />
        </div>
      </div>

      {/* Controls Section */}
      <div className="mt-4">
        <Button
          onClick={toggleAnalysis}
          size="lg"
          variant={isAnalyzing ? "destructive" : "default"}
          className="w-full h-14 text-lg mb-3"
        >
          {isAnalyzing ? "Stop" : "Start Analysis"}
        </Button>
        <p className="text-sm text-muted-foreground text-center">
          {isAnalyzing
            ? "Analyzing audio input..."
            : "Click Start to begin analysis"}
        </p>
      </div>
    </div>
  );
}
