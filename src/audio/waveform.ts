import { debug, error as logError } from '../utils/debug';

export class Waveform {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private audioData: Float32Array | null = null;
  private sampleRate: number = 44100;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');

    if (!this.ctx) {
      logError('Failed to get canvas context for waveform');
    }
  }

  async generateFromFile(file: File): Promise<void> {
    try {
      debug('Generating waveform from file:', file.name);

      // Read the audio file and get its samples
      const audioBuffer = await this.decodeAudioFile(file);

      // Get audio data from the first channel
      this.audioData = audioBuffer.getChannelData(0);
      this.sampleRate = audioBuffer.sampleRate;

      // Draw the waveform
      this.drawWaveform();

    } catch (err) {
      logError('Error generating waveform:', err);
      throw new Error(`Failed to generate waveform: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async decodeAudioFile(file: File): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        if (!event.target?.result) {
          return reject(new Error('Failed to read audio file'));
        }

        const arrayBuffer = event.target.result as ArrayBuffer;

        try {
          // Create AudioContext
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const audioContext = new AudioContext();

          // Decode the audio data
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          resolve(audioBuffer);

        } catch (err) {
          reject(new Error(`Failed to decode audio data: ${err instanceof Error ? err.message : String(err)}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error reading audio file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private drawWaveform(): void {
    if (!this.ctx || !this.audioData) {
      return;
    }

    debug('Drawing waveform with', this.audioData.length, 'samples');

    try {
      // Clear the canvas
      this.ctx.fillStyle = '#1e1e1e';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // JavaScript implementation for waveform generation
      debug('Using JavaScript waveform generation');

      const samples = this.audioData;
      const samplesPerPixel = Math.floor(samples.length / this.canvas.width);

      this.ctx.fillStyle = '#4CAF50';

      for (let i = 0; i < this.canvas.width; i++) {
        // Calculate the max amplitude for this segment
        let maxAmplitude = 0;
        const startSample = i * samplesPerPixel;
        const endSample = Math.min(startSample + samplesPerPixel, samples.length);

        for (let j = startSample; j < endSample; j++) {
          const amplitude = Math.abs(samples[j]);
          if (amplitude > maxAmplitude) {
            maxAmplitude = amplitude;
          }
        }

        // Draw the line for this segment
        const height = maxAmplitude * this.canvas.height;
        const centerY = this.canvas.height / 2;

        this.ctx.fillRect(
          i,
          centerY - height / 2,
          1,
          height
        );
      }

      debug('Waveform drawing completed');
    } catch (err) {
      logError('Error drawing waveform:', err);

      // Draw error indicator
      this.ctx.fillStyle = 'red';
      this.ctx.fillRect(0, 0, this.canvas.width, 5);
    }
  }
}
