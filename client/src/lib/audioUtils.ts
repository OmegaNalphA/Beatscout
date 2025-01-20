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

      // Configure analyzer for detailed frequency analysis
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

// Energy Flux BPM Detection Implementation
export const calculateBPM = (function() {
  const frequencyBands = [
    { start: 20, end: 60 },    // Sub-bass (kick drums)
    { start: 60, end: 200 },   // Bass (strong beats)
    { start: 200, end: 800 },  // Low mids (snares/claps)
    { start: 800, end: 2000 }  // Mids (percussion)
  ];

  const energyHistory: number[][] = Array(4).fill([]).map(() => []);
  const fluxHistory: number[] = [];
  const bpmHistory: number[] = [];
  const maxHistoryLength = 88200; // About 2 seconds at 44.1kHz
  const minBPM = 70;
  const maxBPM = 180;

  function calculateEnergy(frequencyData: Uint8Array, bandStart: number, bandEnd: number): number {
    const binStart = Math.floor((bandStart * 2048) / 44100);
    const binEnd = Math.floor((bandEnd * 2048) / 44100);

    let energy = 0;
    for (let i = binStart; i < binEnd; i++) {
      energy += Math.pow(frequencyData[i], 2);
    }
    return energy;
  }

  function calculateFlux(frequencyData: Uint8Array): number {
    let totalFlux = 0;

    frequencyBands.forEach((band, index) => {
      const energy = calculateEnergy(frequencyData, band.start, band.end);

      if (energyHistory[index].length > 0) {
        const previousEnergy = energyHistory[index][energyHistory[index].length - 1];
        const flux = Math.max(0, energy - previousEnergy);

        // Weight the bands differently (bass frequencies matter more for beats)
        const weight = index === 0 ? 2.0 : // Sub-bass
                      index === 1 ? 1.5 : // Bass
                      1.0;                // Others

        totalFlux += flux * weight;
      }

      energyHistory[index].push(energy);
      if (energyHistory[index].length > maxHistoryLength) {
        energyHistory[index].shift();
      }
    });

    fluxHistory.push(totalFlux);
    if (fluxHistory.length > maxHistoryLength) {
      fluxHistory.shift();
    }

    return totalFlux;
  }

  function detectPeaks(): number[] {
    const windowSize = 5;
    const peaks: number[] = [];

    // Calculate dynamic threshold
    const recentFlux = fluxHistory.slice(-44100); // Last second
    const mean = recentFlux.reduce((a, b) => a + b, 0) / recentFlux.length;
    const variance = recentFlux.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentFlux.length;
    const threshold = mean + Math.sqrt(variance) * 1.5;

    for (let i = windowSize; i < fluxHistory.length - windowSize; i++) {
      const current = fluxHistory[i];

      if (current < threshold) continue;

      // Check if it's a local maximum
      let isPeak = true;
      for (let j = i - windowSize; j <= i + windowSize; j++) {
        if (j === i) continue;
        if (fluxHistory[j] >= current) {
          isPeak = false;
          break;
        }
      }

      if (isPeak) peaks.push(i);
    }

    return peaks;
  }

  return function(frequencyData: Uint8Array): number {
    calculateFlux(frequencyData);
    const peaks = detectPeaks();

    if (peaks.length < 2) {
      return bpmHistory.length > 0 ? bpmHistory[bpmHistory.length - 1] : 0;
    }

    // Calculate intervals between peaks
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }

    // Convert intervals to BPM
    const bpmCandidates = intervals.map(interval => 
      (60 * 44100) / interval
    ).filter(bpm => bpm >= minBPM && bpm <= maxBPM);

    if (bpmCandidates.length === 0) {
      return bpmHistory.length > 0 ? bpmHistory[bpmHistory.length - 1] : 0;
    }

    // Use median for stability
    const sortedBPMs = bpmCandidates.sort((a, b) => a - b);
    const medianBPM = sortedBPMs[Math.floor(sortedBPMs.length / 2)];

    bpmHistory.push(medianBPM);
    if (bpmHistory.length > 8) bpmHistory.shift();

    // Return smoothed BPM
    const validHistory = [...bpmHistory].sort((a, b) => a - b).slice(1, -1);
    let weightedSum = 0;
    let weightSum = 0;

    validHistory.forEach((bpm, index) => {
      const weight = index + 1;
      weightedSum += bpm * weight;
      weightSum += weight;
    });

    return Math.round(weightedSum / weightSum);
  };
})();

export const detectMusicalKey = (function() {
  const keyHistory: string[] = [];
  const historySize = 10;
  const updateInterval = 500; // Update every 500ms
  let lastUpdateTime = 0;

  return function(frequencyData: Uint8Array): string {
    const currentTime = Date.now();

    // Only update key after interval has passed
    if (currentTime - lastUpdateTime < updateInterval) {
      return keyHistory.length > 0 ? keyHistory[keyHistory.length - 1] : '';
    }

    // Simplified key detection using frequency peaks
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const maxIndex = frequencyData.indexOf(Math.max(...Array.from(frequencyData)));
    const noteIndex = Math.floor(maxIndex % 12);
    const currentKey = notes[noteIndex];

    keyHistory.push(currentKey);
    if (keyHistory.length > historySize) {
      keyHistory.shift();
    }

    // Return most common key in history
    const keyCounts = new Map<string, number>();
    let maxCount = 0;
    let dominantKey = currentKey;

    keyHistory.forEach(key => {
      const count = (keyCounts.get(key) || 0) + 1;
      keyCounts.set(key, count);
      if (count > maxCount) {
        maxCount = count;
        dominantKey = key;
      }
    });

    lastUpdateTime = currentTime;
    return dominantKey;
  };
})();