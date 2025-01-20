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

interface Peak {
  position: number;
  value: number;
}

export const calculateBPM = (frequencyData: Uint8Array): number => {
  // Focus on lower frequencies where beats usually occur (20-200Hz)
  const lowFreqData = frequencyData.slice(0, Math.floor(frequencyData.length / 4));

  // Calculate dynamic threshold based on average signal strength
  const average = lowFreqData.reduce((sum, value) => sum + value, 0) / lowFreqData.length;
  const threshold = average * 1.5; // Threshold at 150% of average

  // Find peaks with minimum distance
  const minPeakDistance = 8; // Minimum samples between peaks
  const peaks: Peak[] = [];

  for (let i = 1; i < lowFreqData.length - 1; i++) {
    if (lowFreqData[i] > threshold &&
        lowFreqData[i] > lowFreqData[i - 1] &&
        lowFreqData[i] > lowFreqData[i + 1]) {

      // Check if this is the highest peak in the minimum distance window
      let isHighestInWindow = true;
      for (let j = Math.max(0, i - minPeakDistance); j < Math.min(lowFreqData.length, i + minPeakDistance); j++) {
        if (j !== i && lowFreqData[j] > lowFreqData[i]) {
          isHighestInWindow = false;
          break;
        }
      }

      if (isHighestInWindow) {
        peaks.push({ position: i, value: lowFreqData[i] });
      }
    }
  }

  if (peaks.length < 2) return 0;

  // Calculate average interval between peaks
  let totalInterval = 0;
  let intervalCount = 0;

  for (let i = 1; i < peaks.length; i++) {
    const interval = peaks[i].position - peaks[i - 1].position;
    // Filter out intervals that are too short or too long
    if (interval > 1 && interval < 200) {
      totalInterval += interval;
      intervalCount++;
    }
  }

  if (intervalCount === 0) return 0;

  const averageInterval = totalInterval / intervalCount;

  // Convert to BPM, considering sampling rate and FFT size
  // Sample rate (44100) * 60 seconds / (FFT size * average interval between peaks)
  const bpm = Math.round((60 * 44100) / (2048 * averageInterval));

  // Return BPM within reasonable range (40-220 BPM)
  return Math.min(Math.max(bpm, 40), 220);
};

export const detectMusicalKey = (frequencyData: Uint8Array): string => {
  // Simplified key detection using frequency peaks
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const maxIndex = frequencyData.indexOf(Math.max(...Array.from(frequencyData)));
  const noteIndex = Math.floor(maxIndex % 12);
  return notes[noteIndex];
};