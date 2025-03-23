import { Timeline } from '../timeline/timeline';
import { VideoClip } from '../timeline/clip';
import { VideoBuffer } from '../timeline/video-buffer';

export class ExportRenderer {
  private _timeline: Timeline;
  private _videoBuffer: VideoBuffer;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _frameRate: number = 60;
  private _width: number = 1920;
  private _height: number = 1080;

  constructor(timeline: Timeline) {
    this._timeline = timeline;
    
    // Create a hidden canvas for rendering
    this._canvas = document.createElement('canvas');
    this._canvas.width = this._width;
    this._canvas.height = this._height;
    
    const ctx = this._canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context for export canvas');
    }
    this._ctx = ctx;

    // Initialize video buffer
    this._videoBuffer = new VideoBuffer(this._canvas);
    console.log('ExportRenderer initialized with canvas:', {
      width: this._width,
      height: this._height
    });
  }

  public async exportVideo(): Promise<Blob> {
    // Validate timeline has video clips
    const videoClips = this._timeline.clips.filter(clip => clip instanceof VideoClip);
    if (videoClips.length === 0) {
      throw new Error('No video clips to export');
    }

    console.log('Starting export with clips:', videoClips.map(clip => ({
      id: clip.id,
      name: clip.name,
      duration: clip.duration
    })));

    // Pre-load all video elements
    console.log('Pre-loading video elements...');
    for (const clip of videoClips) {
      if (!clip.source) {
        throw new Error(`Video clip "${clip.name}" has no valid source`);
      }
      try {
        await this._videoBuffer.ensureVideoElement(clip);
        console.log(`Successfully loaded video for clip: ${clip.name}`);
      } catch (error) {
        console.error(`Failed to load video for clip ${clip.name}:`, error);
        throw error;
      }
    }

    // Start recording
    console.log('Starting video export...');
    try {
      await this._videoBuffer.startRecording();
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }

    // Calculate frame timing
    const totalDuration = this._timeline.duration;
    const frameInterval = 1 / this._frameRate;
    const totalFrames = Math.ceil(totalDuration * this._frameRate);
    let currentFrame = 0;

    console.log('Processing frames...', {
      totalDuration,
      frameRate: this._frameRate,
      totalFrames,
      frameInterval
    });

    // Process each frame
    while (currentFrame < totalFrames) {
      // Calculate exact time for this frame
      const frameTime = currentFrame * frameInterval;
      
      // Get active clips at this time
      const activeClips = this._timeline.clips.filter(clip => {
        const clipStart = clip.trackStartTime;
        const clipEnd = clipStart + clip.duration;
        return frameTime >= clipStart && frameTime <= clipEnd;
      });

      // Process frame
      try {
        await this._videoBuffer.processFrame(
          activeClips.filter(clip => clip instanceof VideoClip) as VideoClip[],
          frameTime
        );

        // Force a frame to be captured
        this._ctx.fillStyle = 'transparent';
        this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
      } catch (error) {
        console.error(`Failed to process frame ${currentFrame}:`, error);
        throw error;
      }

      // Update progress
      currentFrame++;
      if (currentFrame % 100 === 0) {
        const progress = (currentFrame / totalFrames) * 100;
        console.log(`Export progress: ${progress.toFixed(1)}% (${currentFrame}/${totalFrames} frames)`);
      }
    }

    // Stop recording and get the video blob
    console.log('Finalizing export...');
    let videoBlob: Blob;
    try {
      videoBlob = await this._videoBuffer.stopRecording();
      console.log('Got video blob:', videoBlob.size, 'bytes');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }

    if (!videoBlob || videoBlob.size === 0) {
      throw new Error('Generated video file is empty');
    }

    return videoBlob;
  }

  public cleanup(): void {
    this._videoBuffer.cleanup();
  }
} 