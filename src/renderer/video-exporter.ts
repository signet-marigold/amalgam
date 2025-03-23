import { Timeline } from '../timeline/timeline';
import { VideoClip } from '../timeline/clip';
import { VideoBuffer } from '../timeline/video-buffer';

export class VideoExporter {
  private _timeline: Timeline;
  private _videoBuffer: VideoBuffer;
  private _mediaRecorder: MediaRecorder | null = null;
  private _recordedChunks: Blob[] = [];
  private _audioContext: AudioContext | null = null;
  private _frameRate: number = 60;
  private _width: number = 1920;
  private _height: number = 1080;

  constructor(timeline: Timeline) {
    this._timeline = timeline;
    this._videoBuffer = new VideoBuffer();
  }

  public async exportVideo(): Promise<Blob> {
    console.log('Starting video export...');

    // Create a hidden canvas for compositing
    const canvas = document.createElement('canvas');
    canvas.width = this._width;
    canvas.height = this._height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context for export canvas');
    }

    // Initialize audio context
    this._audioContext = new AudioContext();

    // Get video clips
    const videoClips = this._timeline.clips.filter(clip => clip instanceof VideoClip);
    if (videoClips.length === 0) {
      throw new Error('No video clips to export');
    }

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

    // Create stream from canvas
    const stream = canvas.captureStream(this._frameRate);
    
    // Check supported MIME types
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    console.log('Using MIME type:', mimeType);
    
    this._mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8000000 // 8 Mbps
    });

    // Set up event handlers
    this._mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log('Received chunk:', event.data.size, 'bytes');
        this._recordedChunks.push(event.data);
      }
    };

    this._mediaRecorder.onerror = (error) => {
      console.error('MediaRecorder error:', error);
    };

    // Start recording
    try {
      this._mediaRecorder.start(1000); // Collect chunks every second
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Failed to start MediaRecorder:', error);
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
      totalFrames
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

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Process frame
      try {
        await this._videoBuffer.processFrame(
          activeClips.filter(clip => clip instanceof VideoClip) as VideoClip[],
          frameTime
        );

        // Draw active videos to canvas
        for (const clip of activeClips) {
          if (clip instanceof VideoClip) {
            const video = this._videoBuffer.videoElements.get(clip.id);
            if (video) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
          }
        }
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

      // Small delay to prevent CPU spinning
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    // Stop recording and get the video blob
    console.log('Finalizing export...');
    return new Promise((resolve, reject) => {
      if (!this._mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      this._mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, chunks:', this._recordedChunks.length);
        try {
          if (this._recordedChunks.length === 0) {
            reject(new Error('No video chunks were recorded'));
            return;
          }
          const blob = new Blob(this._recordedChunks, { type: this._mediaRecorder.mimeType });
          console.log('Created blob:', blob.size, 'bytes');
          this._recordedChunks = [];
          this._mediaRecorder = null;
          resolve(blob);
        } catch (error) {
          console.error('Error creating blob:', error);
          reject(error);
        }
      };

      try {
        this._mediaRecorder.requestData();
        this._mediaRecorder.stop();
      } catch (error) {
        console.error('Error stopping recorder:', error);
        reject(error);
      }
    });
  }

  public cleanup(): void {
    if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
      this._mediaRecorder.stop();
    }
    if (this._audioContext) {
      this._audioContext.close();
    }
    this._videoBuffer.cleanup();
    this._recordedChunks = [];
    this._mediaRecorder = null;
    this._audioContext = null;
  }
} 