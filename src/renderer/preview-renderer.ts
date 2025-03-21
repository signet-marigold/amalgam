import { Timeline } from '../timeline/timeline';
import { VideoClip } from '../timeline/clip';
import { debug, error as logError } from '../utils/debug';

export class PreviewRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private _isPlaying: boolean = false;
  private animationFrameId: number | null = null;
  private playbackStartTime: number = 0;
  private timelineStartTime: number = 0;
  private timeline: Timeline | null = null;
  private timeDisplay: HTMLElement;
  private videoElements: Map<string, HTMLVideoElement> = new Map();
  private videoLoadPromises: Map<string, Promise<void>> = new Map();

  // Callback for when playback state changes
  public onPlaybackStateChange: ((isPlaying: boolean) => void) | null = null;

  constructor() {
    this.canvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.timeDisplay = document.getElementById('time-display') as HTMLElement;

    if (!this.ctx) {
      logError('Failed to get canvas context');
    }

    // Set initial canvas size
    this.canvas.width = 640;
    this.canvas.height = 360;
  }

  async initialize(): Promise<void> {
    debug('Initializing preview renderer');

    // Listen for timeline time updates
    document.getElementById('timeline')?.addEventListener('timeupdate', (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.time === 'number') {
        this.renderFrame(customEvent.detail.time);
      }
    });

    debug('Preview renderer initialized');
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  updatePreview(timeline: Timeline): void {
    this.timeline = timeline;

    // Render the first frame at the current timeline position
    this.renderFrame(timeline.currentTime);
  }

  public startPlayback(): void {
    if (this._isPlaying) return;

    this._isPlaying = true;
    this.playbackStartTime = performance.now() - (this.timeline?.currentTime || 0) * 1000;
    this.timelineStartTime = this.timeline?.currentTime || 0;

    // Start the animation loop
    this.animate();

    // Notify about state change
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(true);
    }

    debug('Started playback');
  }

  public stopPlayback(): void {
    this._isPlaying = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Notify about state change
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(false);
    }

    debug('Stopped playback');
  }

  private animate(): void {
    if (!this._isPlaying || !this.timeline) return;

    // Calculate elapsed time since playback started
    const elapsedSeconds = (performance.now() - this.playbackStartTime) / 1000;
    const currentTime = this.timelineStartTime + elapsedSeconds;

    // Update timeline position
    this.timeline.currentTime = currentTime;

    // Render the current frame
    this.renderFrame(currentTime);

    // Continue the loop
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  private async renderFrame(time: number): Promise<void> {
    if (!this.ctx || !this.timeline) return;

    // Clear the canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Get all clips at the current time
    const clips = this.timeline.clips.filter(clip => {
      const clipStart = clip.trackStartTime;
      const clipEnd = clipStart + clip.duration;
      return time >= clipStart && time < clipEnd;
    });

    // Render each clip
    for (const clip of clips) {
      if (clip instanceof VideoClip) {
        await this.renderVideoClip(clip, time);
      }
    }

    // Update time display
    this.updateTimeDisplay(time);
  }

  private async renderVideoClip(clip: VideoClip, time: number): Promise<void> {
    if (!this.ctx) return;

    // Calculate relative time within the clip
    const relativeTime = clip.getRelativeTime(time);
    if (relativeTime < 0) return;

    try {
      // Get or create video element
      let videoElement = this.videoElements.get(clip.id);
      if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.src = clip.source;
        videoElement.muted = true;
        videoElement.preload = 'auto';
        this.videoElements.set(clip.id, videoElement);
        
        // Create a promise for video loading
        const loadPromise = new Promise<void>((resolve, reject) => {
          const handleLoadedMetadata = () => {
            videoElement?.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement?.removeEventListener('error', handleError);
            resolve();
          };
          const handleError = () => {
            videoElement?.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement?.removeEventListener('error', handleError);
            reject(new Error('Error loading video metadata'));
          };
          videoElement?.addEventListener('loadedmetadata', handleLoadedMetadata);
          videoElement?.addEventListener('error', handleError);
        });

        this.videoLoadPromises.set(clip.id, loadPromise);
      }

      // Wait for video to be ready
      await this.videoLoadPromises.get(clip.id);

      // Set video time
      videoElement.currentTime = relativeTime;

      // Wait for the frame to be ready
      await new Promise<void>((resolve, reject) => {
        const handleSeeked = () => {
          videoElement?.removeEventListener('seeked', handleSeeked);
          videoElement?.removeEventListener('error', handleError);
          resolve();
        };
        const handleError = () => {
          videoElement?.removeEventListener('seeked', handleSeeked);
          videoElement?.removeEventListener('error', handleError);
          reject(new Error('Error seeking video'));
        };
        videoElement?.addEventListener('seeked', handleSeeked);
        videoElement?.addEventListener('error', handleError);
      });

      // Calculate aspect ratio fitting
      const canvasAspect = this.canvas.width / this.canvas.height;
      const videoAspect = clip.aspectRatio;

      let drawWidth = this.canvas.width;
      let drawHeight = this.canvas.height;
      let offsetX = 0;
      let offsetY = 0;

      if (canvasAspect > videoAspect) {
        drawWidth = this.canvas.height * videoAspect;
        offsetX = (this.canvas.width - drawWidth) / 2;
      } else {
        drawHeight = this.canvas.width / videoAspect;
        offsetY = (this.canvas.height - drawHeight) / 2;
      }

      // Draw the video frame
      this.ctx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight);
    } catch (err) {
      logError('Error rendering video frame:', err);
      this.drawErrorPlaceholder();
    }
  }

  private drawErrorPlaceholder(): void {
    if (!this.ctx) return;
    this.ctx.fillStyle = 'red';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'white';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Error rendering frame', this.canvas.width / 2, this.canvas.height / 2);
  }

  private updateTimeDisplay(currentTime: number): void {
    if (!this.timeline) return;

    const currentTimeStr = this.formatTime(currentTime);
    const totalTimeStr = this.formatTime(this.timeline.duration);
    this.timeDisplay.textContent = `${currentTimeStr} / ${totalTimeStr}`;
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Clean up video elements when clips are removed
  public cleanupVideoElement(clipId: string): void {
    const videoElement = this.videoElements.get(clipId);
    if (videoElement) {
      videoElement.src = '';
      videoElement.load();
      this.videoElements.delete(clipId);
      this.videoLoadPromises.delete(clipId);
    }
  }
}
