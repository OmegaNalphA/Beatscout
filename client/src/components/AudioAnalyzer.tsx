import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { WaveformVisualizer } from './WaveformVisualizer';
import { BpmAnalyzer } from './BpmAnalyzer';
import { KeyDetector } from './KeyDetector';
import { AudioProcessor, calculateBPM, detectMusicalKey } from '@/lib/audioUtils';
import { useToast } from "@/hooks/use-toast";

export function AudioAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioProcessor] = useState(() => new AudioProcessor());
  const [timeData, setTimeData] = useState<Uint8Array>(new Uint8Array(1024).fill(128));
  const [bpm, setBpm] = useState(0);
  const [musicalKey, setMusicalKey] = useState('');
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
        setBpm(calculateBPM(freqData));
        setMusicalKey(detectMusicalKey(freqData));
      }
    } catch (error) {
      console.error('Analysis error:', error);
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
        setBpm(0);
        setMusicalKey('');
        toast({
          title: "Analysis Stopped",
          description: "Audio input disconnected",
        });
      }
    } catch (error) {
      console.error('Toggle error:', error);
      toast({
        title: "Error",
        description: "Failed to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full h-[100vh] max-w-4xl mx-auto flex flex-col justify-between p-4">
      <div className="h-[25vh] rounded-lg overflow-hidden">
        <WaveformVisualizer audioData={timeData} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[35vh]">
        <BpmAnalyzer bpm={bpm} />
        <KeyDetector musicalKey={musicalKey} />
      </div>

      <div className="flex flex-col items-center gap-2 pb-4">
        <Button
          onClick={toggleAnalysis}
          size="lg"
          variant={isAnalyzing ? "destructive" : "default"}
          className="w-full max-w-xs"
        >
          {isAnalyzing ? 'Stop' : 'Start Analysis'}
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