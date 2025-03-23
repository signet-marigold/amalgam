import { VideoSettings, Clip, Effect } from '../types/video';

export class VideoProcessor {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.canvas = new OffscreenCanvas(width, height);
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Failed to get canvas context');
    this.ctx = context;
  }

  async processFrame(
    clips: Clip[],
    currentTime: number,
    settings: VideoSettings
  ): Promise<ImageData | null> {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Find clips that overlap with the current time
    const activeClips = clips.filter(clip => 
      currentTime >= clip.startTime && 
      currentTime < clip.startTime + clip.duration
    );
    
    if (activeClips.length === 0) return null;
    
    // Process each active clip
    for (const clip of activeClips) {
      await this.renderClip(clip, currentTime - clip.startTime + clip.offset);
      await this.applyEffects(clip.effects, currentTime - clip.startTime);
    }
    
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  private async renderClip(clip: Clip, time: number): Promise<void> {
    const video = document.createElement('video');
    video.src = clip.sourceUrl;
    
    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.currentTime = time;
        video.onseeked = () => {
          this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
          resolve();
        };
        video.onerror = reject;
      };
      video.onerror = reject;
    });
  }

  private async applyEffects(effects: Effect[], time: number): Promise<void> {
    for (const effect of effects) {
      if (time >= effect.startTime && time < effect.startTime + effect.duration) {
        await this.applyEffect(effect);
      }
    }
  }

  private async applyEffect(effect: Effect): Promise<void> {
    switch (effect.type) {
      case 'brightness':
        this.applyBrightnessEffect(effect.settings.value);
        break;
      case 'contrast':
        this.applyContrastEffect(effect.settings.value);
        break;
      // Add more effects as needed
    }
  }

  private applyBrightnessEffect(value: number): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * value);     // R
      data[i + 1] = Math.min(255, data[i + 1] * value); // G
      data[i + 2] = Math.min(255, data[i + 2] * value); // B
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyContrastEffect(value: number): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const factor = (259 * (value + 255)) / (255 * (259 - value));
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = factor * (data[i] - 128) + 128;     // R
      data[i + 1] = factor * (data[i + 1] - 128) + 128; // G
      data[i + 2] = factor * (data[i + 2] - 128) + 128; // B
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }

  public async exportVideo(
    clips: Clip[],
    settings: VideoSettings,
    onProgress: (progress: number) => void
  ): Promise<Blob> {
    const totalFrames = Math.ceil(clips.reduce((max, clip) => 
      Math.max(max, clip.startTime + clip.duration), 0) * settings.frameRate);
    
    const chunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(this.canvas.captureStream(settings.frameRate));
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    return new Promise(async (resolve, reject) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };
      
      mediaRecorder.onerror = reject;
      mediaRecorder.start();
      
      for (let frame = 0; frame < totalFrames; frame++) {
        const time = frame / settings.frameRate;
        await this.processFrame(clips, time, settings);
        onProgress(frame / totalFrames);
      }
      
      mediaRecorder.stop();
    });
  }
} 