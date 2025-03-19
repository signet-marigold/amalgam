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
  
  togglePlayback(): void {
    if (!this.timeline) {
      debug('No timeline available for playback');
      return;
    }
    
    if (this._isPlaying) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  }
  
  private startPlayback(): void {
    if (!this.timeline) return;
    
    this._isPlaying = true;
    this.playbackStartTime = performance.now();
    this.timelineStartTime = this.timeline.currentTime;
    
    // Start animation loop
    this.animationFrameId = requestAnimationFrame(this.playbackLoop.bind(this));
    
    // Notify about state change
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(true);
    }
    
    debug('Started playback at time:', this.timelineStartTime);
  }
  
  private stopPlayback(): void {
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
  
  private playbackLoop(timestamp: number): void {
    if (!this._isPlaying || !this.timeline) return;
    
    // Calculate elapsed time since playback started
    const elapsedSeconds = (timestamp - this.playbackStartTime) / 1000;
    const currentTime = this.timelineStartTime + elapsedSeconds;
    
    // Update timeline position
    this.timeline.currentTime = currentTime;
    
    // Render the current frame
    this.renderFrame(currentTime);
    
    // Check if we've reached the end of the timeline
    if (currentTime >= this.timeline.duration) {
      this.stopPlayback();
      return;
    }
    
    // Continue the loop
    this.animationFrameId = requestAnimationFrame(this.playbackLoop.bind(this));
  }
  
  private renderFrame(time: number): void {
    if (!this.ctx || !this.timeline) return;
    
    // Clear the canvas
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Find all video clips that are active at the current time
    const activeClips = this.timeline.clips.filter(clip => {
      const clipStart = clip.trackStartTime;
      const clipEnd = clipStart + clip.duration;
      return time >= clipStart && time < clipEnd && clip instanceof VideoClip;
    }) as VideoClip[];
    
    // Sort clips by track position (assuming higher track indices should be rendered on top)
    activeClips.sort((a, b) => {
      const trackA = this.timeline?.tracks.find(track => track.clips.includes(a));
      const trackB = this.timeline?.tracks.find(track => track.clips.includes(b));
      
      if (!trackA || !trackB) return 0;
      return trackA.index - trackB.index;
    });
    
    // Render each active clip
    if (activeClips.length > 0) {
      this.renderVideoClips(activeClips, time);
    }
    
    // Update time display
    this.updateTimeDisplay(time);
  }
  
  private renderVideoClips(clips: VideoClip[], currentTime: number): void {
    if (!this.ctx) return;
    
    // Render the clips in order (bottom to top)
    clips.forEach(clip => {
      const relativeTime = clip.getRelativeTime(currentTime);
      if (relativeTime >= 0) {
        this.renderVideoClip(clip, relativeTime);
      }
    });
  }
  
  // Cache for video elements to avoid creating them repeatedly
  private videoCache: Map<string, HTMLVideoElement> = new Map();
  
  private renderVideoClip(clip: VideoClip, time: number): void {
    if (!this.ctx) return;
    
    // Check cache for video element or create a new one
    let video = this.videoCache.get(clip.id);
    if (!video) {
      video = document.createElement('video');
      video.preload = 'auto';
      video.src = clip.source;
      video.muted = false; // Ensure audio is on by default
      video.crossOrigin = 'anonymous'; // To avoid CORS issues
      video.setAttribute('playsinline', ''); // For iOS support
      this.videoCache.set(clip.id, video);
      
      // Add video to the DOM but hide it
      video.style.position = 'fixed';
      video.style.left = '-9999px';
      video.style.display = 'none';
      document.body.appendChild(video);
      
      // Load the video
      video.load();
    }
    
    // Set current time for the video
    if (Math.abs(video.currentTime - time) > 0.2) {
      video.currentTime = time;
    }
    
    // Play the video if we're playing the timeline
    if (this._isPlaying) {
      video.play().catch(err => {
        logError('Error playing video:', err);
      });
    } else {
      video.pause();
    }
    
    try {
      // Calculate aspect ratio fitting
      const canvasAspect = this.canvas.width / this.canvas.height;
      const videoAspect = clip.aspectRatio;
      
      let drawWidth = this.canvas.width;
      let drawHeight = this.canvas.height;
      let offsetX = 0;
      let offsetY = 0;
      
      if (canvasAspect > videoAspect) {
        // Canvas is wider than video
        drawWidth = this.canvas.height * videoAspect;
        offsetX = (this.canvas.width - drawWidth) / 2;
      } else {
        // Canvas is taller than video
        drawHeight = this.canvas.width / videoAspect;
        offsetY = (this.canvas.height - drawHeight) / 2;
      }
      
      // Draw the video frame
      this.ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
    } catch (err) {
      logError('Error rendering video frame');
      
      // Show an error placeholder
      if (this.ctx) {
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Error rendering frame', this.canvas.width / 2, this.canvas.height / 2);
      }
    }
  }
  
  private updateTimeDisplay(currentTime: number): void {
    if (!this.timeline) return;
    
    const formattedCurrentTime = this.formatTime(currentTime);
    const formattedDuration = this.formatTime(this.timeline.duration);
    
    this.timeDisplay.textContent = `${formattedCurrentTime} / ${formattedDuration}`;
  }
  
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
