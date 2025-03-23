import { Timeline } from './timeline';
import { VideoBuffer } from './video-buffer';
import { StorageService } from '../services/storage-service';

export class PreviewRenderer {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _timeline: Timeline;
  private _videoBuffer: VideoBuffer;
  private _isPlaying: boolean = false;
  private _lastFrameTime: number = 0;
  private _frameCount: number = 0;
  private _fps: number = 0;
  private _lastFpsUpdate: number = 0;
  private _debugOverlay: HTMLDivElement | null = null;
  private _timeUpdateCallback: ((time: number) => void) | null = null;
  private _playbackStartTime: number = 0;
  private _frameInterval: number = 1000 / 60; // 60 FPS

  constructor(canvas: HTMLCanvasElement, timeline: Timeline) {
    this._canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this._ctx = ctx;
    this._timeline = timeline;
    this._videoBuffer = new VideoBuffer(canvas);
    this._createDebugOverlay();
    this._setupAutoSave();
  }

  private _createDebugOverlay(): void {
    this._debugOverlay = document.createElement('div');
    this._debugOverlay.style.position = 'absolute';
    this._debugOverlay.style.top = '10px';
    this._debugOverlay.style.left = '10px';
    this._debugOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this._debugOverlay.style.color = '#fff';
    this._debugOverlay.style.padding = '5px 10px';
    this._debugOverlay.style.fontFamily = 'monospace';
    this._debugOverlay.style.fontSize = '12px';
    this._debugOverlay.style.zIndex = '1000';
    this._canvas.parentElement?.appendChild(this._debugOverlay);
  }

  private _setupAutoSave(): void {
    // Auto-save timeline state every 30 seconds
    setInterval(() => {
      if (this._timeline) {
        StorageService.saveTimelineState(this._timeline);
      }
    }, 30000);
  }

  private _updateDebugOverlay(frameTime: number): void {
    if (!this._debugOverlay) return;

    const now = performance.now();
    this._frameCount++;

    // Update FPS counter every second
    if (now - this._lastFpsUpdate >= 1000) {
      this._fps = Math.round((this._frameCount * 1000) / (now - this._lastFpsUpdate));
      this._frameCount = 0;
      this._lastFpsUpdate = now;
    }

    const activeClips = this._timeline.clips.filter(clip => {
      const clipStart = clip.trackStartTime;
      const clipEnd = clipStart + clip.duration;
      return this._timeline.currentTime >= clipStart && this._timeline.currentTime <= clipEnd;
    });

    this._debugOverlay.innerHTML = `
      FPS: ${this._fps}<br>
      Frame Time: ${frameTime.toFixed(2)}ms<br>
      Active Clips: ${activeClips.length}<br>
      Current Time: ${this._timeline.currentTime.toFixed(2)}s<br>
      Buffer State: ${this._videoBuffer.isExporting ? 'Exporting' : 'Ready'}
    `;
  }

  public set onTimeUpdate(callback: (time: number) => void) {
    this._timeUpdateCallback = callback;
  }

  public async updatePreview(): Promise<void> {
    if (!this._isPlaying) return;

    const now = performance.now();
    const frameTime = now - this._lastFrameTime;
    this._lastFrameTime = now;

    // Calculate elapsed time since playback started
    const elapsedTime = (now - this._playbackStartTime) / 1000;
    const newTime = this._timeline.currentTime + elapsedTime;

    // Update timeline time
    this._timeline.currentTime = newTime;

    // Process frame
    await this._videoBuffer.processFrame(this._timeline.clips, newTime);

    // Update debug overlay
    this._updateDebugOverlay(frameTime);

    // Update time and trigger callback
    if (this._timeUpdateCallback) {
      this._timeUpdateCallback(newTime);
    }

    // Request next frame
    requestAnimationFrame(() => this.updatePreview());
  }

  public play(): void {
    if (this._isPlaying) return;
    this._isPlaying = true;
    this._lastFrameTime = performance.now();
    this._playbackStartTime = performance.now();
    this.updatePreview();
  }

  public pause(): void {
    this._isPlaying = false;
  }

  public stop(): void {
    this._isPlaying = false;
    this._timeline.currentTime = 0;
    if (this._timeUpdateCallback) {
      this._timeUpdateCallback(0);
    }
  }

  public seek(time: number): void {
    this._timeline.currentTime = time;
    if (this._timeUpdateCallback) {
      this._timeUpdateCallback(time);
    }
  }

  public updateTimeline(timeline: Timeline): void {
    this._timeline = timeline;
  }

  public async exportVideo(): Promise<void> {
    if (!this._videoBuffer || !this._timeline) {
      throw new Error('PreviewRenderer not properly initialized');
    }

    // Store original state
    const wasPlaying = this._isPlaying;
    const originalTime = this._timeline.currentTime;

    try {
      // Pause playback if playing
      if (wasPlaying) {
        this.pause();
      }

      // Start recording
      await this._videoBuffer.startRecording();

      // Calculate total duration and frame count
      const totalDuration = this._timeline.duration;
      const frameCount = Math.ceil(totalDuration * this._videoBuffer.frameRate);
      const frameInterval = 1000 / this._videoBuffer.frameRate;

      console.log('Starting export:', {
        totalDuration,
        frameCount,
        frameRate: this._videoBuffer.frameRate
      });

      // Process each frame
      for (let i = 0; i < frameCount; i++) {
        const frameTime = (i * frameInterval) / 1000;
        this._timeline.currentTime = frameTime;

        // Process frame
        await this._videoBuffer.processFrame(this._timeline.clips, frameTime);

        // Log progress every 100 frames
        if (i % 100 === 0) {
          console.log(`Export progress: ${Math.round((i / frameCount) * 100)}%`);
        }
      }

      // Stop recording and get blob
      const blob = await this._videoBuffer.stopRecording();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exported-video.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('Export completed successfully');
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    } finally {
      // Restore original state
      this._timeline.currentTime = originalTime;
      if (wasPlaying) {
        this.play();
      }
    }
  }

  public cleanup(): void {
    this._isPlaying = false;
    if (this._debugOverlay) {
      this._debugOverlay.remove();
      this._debugOverlay = null;
    }
    this._videoBuffer.cleanup();
  }
} 