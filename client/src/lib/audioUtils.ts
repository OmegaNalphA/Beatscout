export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private smoothingFactor: number = 0.8;
  private previousData: Float32Array | null = null;

  async initialize(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false
        }
      });

      this.mediaStream = stream;
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyserNode = this.audioContext.createAnalyser();

      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyserNode);

      // Configure analyzer
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;

    } catch (error) {
      throw new Error(`Failed to initialize audio: ${error}`);
    }
  }

  getTimeData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array();
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(dataArray);
    return this.smoothData(dataArray);
  }

  private smoothData(data: Uint8Array): Uint8Array {
    const length = data.length;
    if (!this.previousData) {
      this.previousData = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        this.previousData[i] = data[i];
      }
    }

    // Convert Uint8Array to Float32Array for calculations
    const currentData = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      // Apply exponential smoothing
      currentData[i] = this.smoothingFactor * (data[i]) + 
                      (1 - this.smoothingFactor) * this.previousData[i];

      // Additional pass to smooth neighboring samples
      if (i > 0 && i < length - 1) {
        currentData[i] = 0.25 * currentData[i-1] + 
                        0.5 * currentData[i] + 
                        0.25 * data[i+1];
      }
    }

    // Store the smoothed data for next frame
    this.previousData = currentData;

    // Convert back to Uint8Array
    const smoothedData = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      smoothedData[i] = Math.round(currentData[i]);
    }

    return smoothedData;
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array();
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.mediaStream = null;
    this.audioContext = null;
    this.analyserNode = null;
    this.previousData = null;
  }

  isInitialized(): boolean {
    return this.audioContext !== null && this.analyserNode !== null;
  }
}

export const calculateBPM = (frequencyData: Uint8Array): number => {
  // Basic BPM detection using peak analysis
  const peaks = [];
  let threshold = 200;

  for (let i = 0; i < frequencyData.length; i++) {
    if (frequencyData[i] > threshold) {
      peaks.push(i);
    }
  }

  if (peaks.length < 2) return 0;

  const averageInterval = peaks.reduce((acc, val, idx, arr) => {
    if (idx === 0) return acc;
    return acc + (val - arr[idx - 1]);
  }, 0) / (peaks.length - 1);

  // Convert to BPM
  const bpm = Math.round((60 * 44100) / (averageInterval * 2048));
  return Math.min(Math.max(bpm, 60), 200); // Clamp between 60-200 BPM
};

export const detectMusicalKey = (frequencyData: Uint8Array): string => {
  // Simplified key detection using frequency peaks
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const maxIndex = frequencyData.indexOf(Math.max(...Array.from(frequencyData)));
  const noteIndex = Math.floor(maxIndex % 12);
  return notes[noteIndex];
};