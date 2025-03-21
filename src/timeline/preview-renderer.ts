import { Timeline } from './timeline';
import { VideoClip } from './clip';

export class PreviewRenderer {
  private _canvas: HTMLCanvasElement | null = null;
  private _timeline: Timeline | null = null;
  private _videoElements: Map<string, HTMLVideoElement> = new Map();
  private _isPlaying: boolean = false;
  private _playbackStartTime: number = 0;
  private _timelineStartTime: number = 0;
  private _animationFrameId: number | null = null;
  private _lastFrameTime: number = 0;
  private _activeVideoElement: HTMLVideoElement | null = null;
  private _onTimeUpdate: ((time: number) => void) | null = null;
  private _pausedTime: number = 0;
  private _lastVideoTime: number = 0;

  constructor(canvas: HTMLCanvasElement, timeline: Timeline) {
    this._canvas = canvas;
    this._timeline = timeline;
  }

  public setTimeUpdateCallback(callback: (time: number) => void): void {
    this._onTimeUpdate = callback;
  }

  private createVideoElement(clip: VideoClip): HTMLVideoElement {
    const video = document.createElement('video');
    video.src = clip.source;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.loop = true;
    return video;
  }

  private async updatePreview(): Promise<void> {
    if (!this._canvas || !this._timeline) return;

    const ctx = this._canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    // Get current time from timeline
    const currentTime = this._timeline.currentTime;

    // Find active clips at current time
    const activeClips = this._timeline.clips.filter(clip => {
      const clipStart = clip.trackStartTime;
      const clipEnd = clipStart + clip.duration;
      return currentTime >= clipStart && currentTime <= clipEnd;
    });

    // Sort clips by track index (bottom to top)
    activeClips.sort((a, b) => {
      const trackA = this._timeline?.tracks.find(t => t.clips.includes(a));
      const trackB = this._timeline?.tracks.find(t => t.clips.includes(b));
      return (trackB?.index ?? 0) - (trackA?.index ?? 0);
    });

    // Render each active clip
    for (const clip of activeClips) {
      if (clip instanceof VideoClip) {
        let videoElement = this._videoElements.get(clip.id);
        
        // Create video element if it doesn't exist
        if (!videoElement) {
          videoElement = this.createVideoElement(clip);
          this._videoElements.set(clip.id, videoElement);
        }

        // Calculate relative position within the clip
        const relativeTime = currentTime - clip.trackStartTime;
        const clipStart = clip.startTime;
        const clipEnd = clip.endTime;
        const clipDuration = clipEnd - clipStart;

        // Calculate the frame to display
        const frameTime = clipStart + (relativeTime % clipDuration);

        // Handle video element state
        if (this._isPlaying) {
          if (this._activeVideoElement !== videoElement) {
            // Switch to new video element
            if (this._activeVideoElement) {
              this._activeVideoElement.pause();
            }
            this._activeVideoElement = videoElement;
            videoElement.currentTime = frameTime;
            videoElement.play();
          }
        } else {
          // When paused, just seek to the correct frame
          videoElement.currentTime = frameTime;
          this._activeVideoElement = null;
        }

        // Draw the video frame
        ctx.drawImage(videoElement, 0, 0, this._canvas.width, this._canvas.height);
      }
    }
  }

  public async play(): Promise<void> {
    if (!this._timeline) return;

    this._isPlaying = true;
    const now = performance.now();
    
    // If we're resuming from a pause, adjust the start time to account for the pause duration
    if (this._pausedTime > 0) {
      const pauseDuration = now - this._pausedTime;
      this._playbackStartTime += pauseDuration;
    } else {
      // When starting playback, set the start time to the current timeline time
      this._playbackStartTime = now;
      this._timelineStartTime = this._timeline.currentTime;
    }
    
    this._lastFrameTime = now;
    this._pausedTime = 0;

    // Start the animation loop
    const animate = async (timestamp: number) => {
      if (!this._isPlaying || !this._timeline) return;

      // Calculate elapsed time since playback started
      const elapsedTime = (timestamp - this._playbackStartTime) / 1000;
      const newTime = this._timelineStartTime + elapsedTime;
      
      // Update timeline current time
      this._timeline.currentTime = newTime;
      // Notify React about the time update
      this._onTimeUpdate?.(newTime);

      // Update preview frame
      await this.updatePreview();

      // Request next frame
      this._animationFrameId = requestAnimationFrame(animate);
    };

    this._animationFrameId = requestAnimationFrame(animate);
  }

  public stop(): void {
    this._isPlaying = false;
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
    if (this._activeVideoElement) {
      this._activeVideoElement.pause();
      this._activeVideoElement = null;
    }
    this._pausedTime = performance.now();
  }

  public seek(time: number): void {
    if (!this._timeline) return;
    this._timeline.currentTime = time;
    this._onTimeUpdate?.(time);
    this.updatePreview();
  }

  public cleanupVideoElement(clipId: string): void {
    const videoElement = this._videoElements.get(clipId);
    if (videoElement) {
      if (this._activeVideoElement === videoElement) {
        this._activeVideoElement = null;
      }
      videoElement.pause();
      videoElement.src = '';
      this._videoElements.delete(clipId);
    }
  }
} 