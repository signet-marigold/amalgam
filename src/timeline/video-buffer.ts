import { VideoClip, Clip } from './clip';
import { ClipManager } from './clip-manager';

export class VideoBuffer {
  private _clipManager: ClipManager;
  private _frameRate: number = 60;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _mediaRecorder: MediaRecorder | null = null;
  private _recordedChunks: Blob[] = [];
  private _isRecording: boolean = false;
  private _isExporting: boolean = false;
  private _lastFrameTime: number = 0;
  private _frameInterval: number = 1000 / this._frameRate;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this._ctx = ctx;
    this._clipManager = new ClipManager(canvas);
    console.log('VideoBuffer initialized with canvas');
  }

  public get frameRate(): number {
    return this._frameRate;
  }

  public get isExporting(): boolean {
    return this._isExporting;
  }

  public async processFrame(clips: Clip[], currentTime: number): Promise<void> {
    // Filter for video clips
    const videoClips = clips.filter((clip): clip is VideoClip => clip instanceof VideoClip);

    // Add any new clips to the manager
    for (const clip of videoClips) {
      if (!this._clipManager.getClipDuration(clip.id)) {
        await this._clipManager.addClip(clip);
      }
    }

    // Update clip positions
    for (const clip of videoClips) {
      this._clipManager.updateClipPosition(clip.id, clip.trackStartTime);
    }

    // Render the frame
    await this._clipManager.renderFrame(this._ctx, currentTime);
  }

  public async startRecording(): Promise<void> {
    if (this._isRecording) {
      console.warn('Recording already in progress');
      return;
    }

    try {
      // Create a MediaStream from the canvas
      const stream = this._canvas.captureStream(this._frameRate);
      
      // Create MediaRecorder with WebM codec
      this._mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000 // 5 Mbps
      });

      // Reset recorded chunks
      this._recordedChunks = [];

      // Handle data available event
      this._mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this._recordedChunks.push(event.data);
        }
      };

      // Start recording
      this._mediaRecorder.start(1000); // Collect data every second
      this._isRecording = true;
      this._isExporting = true;
      this._lastFrameTime = performance.now();

      console.log('Started recording');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  public async stopRecording(): Promise<Blob> {
    if (!this._mediaRecorder || !this._isRecording) {
      throw new Error('MediaRecorder not initialized or not recording');
    }

    try {
      console.log('Stopping recording...');
      
      // Stop the MediaRecorder
      this._mediaRecorder.stop();
      this._isRecording = false;

      // Wait for all chunks to be collected
      await new Promise<void>((resolve) => {
        this._mediaRecorder!.onstop = () => {
          console.log('MediaRecorder stopped');
          resolve();
        };
      });

      // Create blob from recorded chunks
      const blob = new Blob(this._recordedChunks, { type: 'video/webm' });
      this._recordedChunks = [];
      this._isExporting = false;

      console.log('Recording stopped successfully');
      return blob;
    } catch (error) {
      console.error('Error stopping recorder:', error);
      this._isExporting = false;
      throw error;
    }
  }

  public cleanup(): void {
    // Clean up clip manager
    this._clipManager.cleanup();

    // Clean up recording
    if (this._mediaRecorder && this._isRecording) {
      this._mediaRecorder.stop();
      this._isRecording = false;
    }
    this._recordedChunks = [];
    this._mediaRecorder = null;
    this._isExporting = false;
  }
} 