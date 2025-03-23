import { VideoClip, Clip } from './clip';
import { EventEmitter } from './event-emitter';

interface ClipState {
  clip: VideoClip;
  videoElement: HTMLVideoElement;
  isActive: boolean;
  lastUpdateTime: number;
}

export class ClipManager extends EventEmitter {
  private _clipStates: Map<string, ClipState> = new Map();
  private _activeClips: Set<string> = new Set();
  private _width: number = 1920;
  private _height: number = 1080;
  private _frameRate: number = 60;
  private _debugOverlay: HTMLDivElement | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    super();
    this._createDebugOverlay();
  }

  private _createDebugOverlay(): void {
    this._debugOverlay = document.createElement('div');
    this._debugOverlay.style.position = 'absolute';
    this._debugOverlay.style.top = '50px';
    this._debugOverlay.style.left = '10px';
    this._debugOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this._debugOverlay.style.color = '#fff';
    this._debugOverlay.style.padding = '5px 10px';
    this._debugOverlay.style.fontFamily = 'monospace';
    this._debugOverlay.style.fontSize = '12px';
    this._debugOverlay.style.zIndex = '1000';
    this.canvas.parentElement?.appendChild(this._debugOverlay);
  }

  private _updateDebugOverlay(): void {
    if (!this._debugOverlay) return;

    const debugInfo = {
      totalClips: this._clipStates.size,
      activeClips: Array.from(this._activeClips).map(id => {
        const state = this._clipStates.get(id);
        return {
          id,
          trackId: state?.clip.trackId,
          startTime: state?.clip.trackStartTime,
          duration: state?.clip.duration,
          isActive: state?.isActive,
          videoTime: state?.videoElement.currentTime
        };
      }),
      clipStates: Array.from(this._clipStates.entries()).map(([id, state]) => ({
        id,
        trackId: state.clip.trackId,
        startTime: state.clip.trackStartTime,
        duration: state.clip.duration,
        isActive: state.isActive,
        videoReady: state.videoElement.readyState
      }))
    };

    this._debugOverlay.innerHTML = `
      <div style="margin-bottom: 5px;">ClipManager State:</div>
      <pre style="margin: 0; font-size: 10px;">${JSON.stringify(debugInfo, null, 2)}</pre>
    `;
  }

  public async addClip(clip: VideoClip): Promise<void> {
    console.log('Adding clip to manager:', clip.id);
    
    // Create and initialize video element
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.width = this._width;
    video.height = this._height;
    video.muted = !clip.hasAudio;
    video.playsInline = true;
    video.loop = true;
    video.src = clip.source;

    // Wait for video metadata to load
    await new Promise<void>((resolve, reject) => {
      const loadHandler = () => {
        video.removeEventListener('loadedmetadata', loadHandler);
        video.removeEventListener('error', errorHandler);
        resolve();
      };
      const errorHandler = (e: ErrorEvent) => {
        video.removeEventListener('loadedmetadata', loadHandler);
        video.removeEventListener('error', errorHandler);
        reject(new Error(`Failed to load video for clip ${clip.id}: ${e.message}`));
      };
      video.addEventListener('loadedmetadata', loadHandler);
      video.addEventListener('error', errorHandler as EventListener);
      video.load();
    });

    // Store clip state
    this._clipStates.set(clip.id, {
      clip,
      videoElement: video,
      isActive: false,
      lastUpdateTime: 0
    });

    this._updateDebugOverlay();
    this.emit('clipAdded', { clipId: clip.id });
  }

  public removeClip(clipId: string): void {
    const state = this._clipStates.get(clipId);
    if (state) {
      state.videoElement.pause();
      state.videoElement.src = '';
      state.videoElement.load();
      this._clipStates.delete(clipId);
      this._activeClips.delete(clipId);
    }
    this._updateDebugOverlay();
    this.emit('clipRemoved', { clipId });
  }

  public updateClipPosition(clipId: string, trackStartTime: number): void {
    const state = this._clipStates.get(clipId);
    if (state) {
      state.clip.trackStartTime = trackStartTime;
      this._updateDebugOverlay();
      this.emit('clipMoved', { clipId, trackStartTime });
    }
  }

  public async renderFrame(ctx: CanvasRenderingContext2D, currentTime: number): Promise<void> {
    // Clear previous frame
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Find active clips at current time
    const activeClips = Array.from(this._clipStates.values())
      .filter(state => {
        const clipStart = state.clip.trackStartTime;
        const clipEnd = clipStart + state.clip.duration;
        const isActive = currentTime >= clipStart && currentTime <= clipEnd;
        
        // Update active state
        if (isActive !== state.isActive) {
          state.isActive = isActive;
          if (isActive) {
            this._activeClips.add(state.clip.id);
          } else {
            this._activeClips.delete(state.clip.id);
          }
        }
        
        return isActive;
      })
      .sort((a, b) => b.clip.trackId.localeCompare(a.clip.trackId));

    // Render each active clip
    for (const state of activeClips) {
      const clipTime = (currentTime - state.clip.trackStartTime) % state.clip.duration;
      
      // Update video time if needed
      if (Math.abs(state.videoElement.currentTime - clipTime) > 0.033) { // 33ms threshold
        state.videoElement.currentTime = clipTime;
      }

      // Ensure video is playing if it should be
      if (state.videoElement.paused) {
        try {
          await state.videoElement.play();
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('Error playing video:', error);
          }
        }
      }

      // Draw frame
      ctx.drawImage(state.videoElement, 0, 0, this.canvas.width, this.canvas.height);
    }

    this._updateDebugOverlay();
  }

  public getClipDuration(clipId: string): number {
    return this._clipStates.get(clipId)?.clip.duration ?? 0;
  }

  public getActiveClips(): VideoClip[] {
    return Array.from(this._activeClips)
      .map(id => this._clipStates.get(id)?.clip)
      .filter((clip): clip is VideoClip => clip !== undefined);
  }

  public cleanup(): void {
    // Clean up all video elements
    for (const state of this._clipStates.values()) {
      state.videoElement.pause();
      state.videoElement.src = '';
      state.videoElement.load();
    }
    this._clipStates.clear();
    this._activeClips.clear();

    // Clean up debug overlay
    if (this._debugOverlay) {
      this._debugOverlay.remove();
      this._debugOverlay = null;
    }
  }
} 