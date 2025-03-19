import { Timeline } from './timeline/timeline';
import { PreviewRenderer } from './renderer/preview-renderer';
import { FinalRenderer } from './renderer/final-renderer';
import { debug, error as logError } from './utils/debug';
import { loadFFmpeg } from './utils/ffmpeg-utils';
import { VideoClip, AudioClip, Clip } from './timeline/clip';

export class App {
  private timeline: Timeline;
  private previewRenderer: PreviewRenderer;
  private finalRenderer: FinalRenderer;
  private isFFmpegLoaded = false;
  private importBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private fileInput: HTMLInputElement;
  private exportDialog: HTMLElement;
  private clipPool: Clip[] = [];
  private selectedPoolClip: Clip | null = null;
  private addToTimelineBtn: HTMLButtonElement;
  private deleteClipBtn: HTMLButtonElement;
  
  constructor() {
    this.importBtn = document.getElementById('import-btn') as HTMLButtonElement;
    this.exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.exportDialog = document.getElementById('export-dialog') as HTMLElement;
    this.addToTimelineBtn = document.getElementById('add-to-timeline-btn') as HTMLButtonElement;
    this.deleteClipBtn = document.getElementById('delete-clip-btn') as HTMLButtonElement;
    
    this.timeline = new Timeline();
    this.previewRenderer = new PreviewRenderer();
    this.finalRenderer = new FinalRenderer();
    
    this.setupEventListeners();
  }
  
  async initialize(): Promise<void> {
    try {
      debug('Initializing application...');
      
      // Initialize FFmpeg
      debug('Loading FFmpeg...');
      await this.initFFmpeg();
      debug('FFmpeg loaded successfully');
      
      // Initialize UI components
      await this.timeline.initialize();
      await this.previewRenderer.initialize();
      
      debug('Application initialized successfully');
    } catch (error) {
      logError('Failed to initialize application:', error);
      throw error;
    }
  }
  
  private async initFFmpeg(): Promise<void> {
    try {
      await loadFFmpeg();
      this.isFFmpegLoaded = true;
    } catch (error) {
      logError('Failed to load FFmpeg:', error);
      console.warn('Continuing without FFmpeg - some features may be limited');
      // We'll continue without FFmpeg for now
      this.isFFmpegLoaded = false;
    }
  }
  
  // Updates the play/pause button based on the current playback state
  private updatePlayPauseButton(): void {
    const playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
    if (playPauseBtn) {
      playPauseBtn.textContent = this.previewRenderer.isPlaying ? '❚❚' : '▶';
    }
  }
  
  private setupEventListeners(): void {
    // Import button click
    this.importBtn.addEventListener('click', () => {
      this.fileInput.click();
    });
    
    // File input change
    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.handleFileImport(target.files);
      }
    });
    
    // Export button click
    this.exportBtn.addEventListener('click', () => {
      this.showExportDialog();
    });
    
    // Export dialog buttons
    const exportCancelBtn = document.getElementById('export-cancel-btn') as HTMLButtonElement;
    const exportConfirmBtn = document.getElementById('export-confirm-btn') as HTMLButtonElement;
    
    exportCancelBtn.addEventListener('click', () => {
      this.exportDialog.classList.add('hidden');
    });
    
    exportConfirmBtn.addEventListener('click', () => {
      this.startExport();
    });
    
    // Quality slider
    const qualitySlider = document.getElementById('export-quality') as HTMLInputElement;
    const qualityValue = document.getElementById('quality-value') as HTMLElement;
    
    qualitySlider.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      qualityValue.textContent = `${value}%`;
    });
    
    // Play/Pause button
    const playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
    playPauseBtn.addEventListener('click', () => {
      this.previewRenderer.togglePlayback();
      this.updatePlayPauseButton();
    });
    
    // Update play/pause button state
    this.previewRenderer.onPlaybackStateChange = (isPlaying) => {
      this.updatePlayPauseButton();
    };
    
    // Zoom controls
    const zoomInBtn = document.getElementById('zoom-in-btn') as HTMLButtonElement;
    const zoomOutBtn = document.getElementById('zoom-out-btn') as HTMLButtonElement;
    
    zoomInBtn.addEventListener('click', () => {
      this.timeline.zoomIn();
    });
    
    zoomOutBtn.addEventListener('click', () => {
      this.timeline.zoomOut();
    });
    
    // Split button
    const splitBtn = document.getElementById('split-btn') as HTMLButtonElement;
    splitBtn.addEventListener('click', () => {
      this.timeline.splitClipAtPlayhead();
    });
    
    // Add To Timeline button
    this.addToTimelineBtn.addEventListener('click', () => {
      if (this.selectedPoolClip) {
        this.addClipToTimeline(this.selectedPoolClip);
      }
    });
    
    // Delete Clip button
    this.deleteClipBtn.addEventListener('click', () => {
      if (this.selectedPoolClip) {
        this.deleteClipFromPool(this.selectedPoolClip.id);
      }
    });
    
    // Close error notification
    const errorCloseBtn = document.querySelector('#error-notification .close-btn') as HTMLButtonElement;
    if (errorCloseBtn) {
      errorCloseBtn.addEventListener('click', () => {
        const errorNotification = document.getElementById('error-notification') as HTMLElement;
        errorNotification.classList.add('hidden');
      });
    }
  }
  
  private addClipToTimeline(clip: Clip): void {
    try {
      // Clone the clip to add to timeline
      let timelineClip: Clip;
      
      if (clip instanceof VideoClip) {
        timelineClip = new VideoClip({
          id: `timeline-${clip.id}`,
          name: clip.name,
          source: clip.source,
          sourceFile: clip.sourceFile,
          startTime: clip.startTime,
          endTime: clip.endTime,
          trackStartTime: 0, // Add to the beginning of the timeline
          width: clip.width,
          height: clip.height,
          hasAudio: clip.hasAudio
        });
        
        this.timeline.addClip(timelineClip);
        
        // If the video has audio, add the audio clip too
        if (clip.hasAudio) {
          const audioClipFromPool = this.clipPool.find(
            c => c instanceof AudioClip && c.linkedClipId === clip.id
          ) as AudioClip | undefined;
          
          if (audioClipFromPool) {
            const audioClip = new AudioClip({
              id: `timeline-${audioClipFromPool.id}`,
              name: audioClipFromPool.name,
              source: audioClipFromPool.source,
              sourceFile: audioClipFromPool.sourceFile,
              startTime: audioClipFromPool.startTime,
              endTime: audioClipFromPool.endTime,
              trackStartTime: 0,
              linkedClipId: timelineClip.id
            });
            
            this.timeline.addClip(audioClip);
          }
        }
      } else if (clip instanceof AudioClip) {
        const linkedClipId = clip.linkedClipId ? `timeline-${clip.linkedClipId}` : undefined;
        
        timelineClip = new AudioClip({
          id: `timeline-${clip.id}`,
          name: clip.name,
          source: clip.source,
          sourceFile: clip.sourceFile,
          startTime: clip.startTime,
          endTime: clip.endTime,
          trackStartTime: 0,
          linkedClipId: linkedClipId
        });
        
        this.timeline.addClip(timelineClip);
      }
      
      // Update the preview
      this.previewRenderer.updatePreview(this.timeline);
      
      debug('Added clip to timeline:', clip.name);
    } catch (error) {
      logError('Error adding clip to timeline:', error);
      
      const errorNotification = document.getElementById('error-notification') as HTMLElement;
      const errorMessage = document.getElementById('error-message') as HTMLElement;
      errorMessage.textContent = `Error adding clip to timeline: ${error instanceof Error ? error.message : String(error)}`;
      errorNotification.classList.remove('hidden');
    }
  }
  
  private deleteClipFromPool(clipId: string): void {
    try {
      const clipIndex = this.clipPool.findIndex(clip => clip.id === clipId);
      
      if (clipIndex === -1) {
        throw new Error(`Clip with ID ${clipId} not found in pool`);
      }
      
      const clip = this.clipPool[clipIndex];
      
      // If it's a video clip with linked audio, delete the audio too
      if (clip instanceof VideoClip) {
        const linkedAudioIndex = this.clipPool.findIndex(
          c => c instanceof AudioClip && (c as AudioClip).linkedClipId === clipId
        );
        
        if (linkedAudioIndex !== -1) {
          this.clipPool.splice(linkedAudioIndex, 1);
        }
      }
      
      // Remove the clip from the pool
      this.clipPool.splice(clipIndex, 1);
      
      // Reset selection
      this.selectedPoolClip = null;
      this.addToTimelineBtn.disabled = true;
      this.deleteClipBtn.disabled = true;
      
      // Re-render the clip pool
      this.renderClipPool();
      
      debug('Deleted clip from pool:', clipId);
    } catch (error) {
      logError('Error deleting clip from pool:', error);
      
      const errorNotification = document.getElementById('error-notification') as HTMLElement;
      const errorMessage = document.getElementById('error-message') as HTMLElement;
      errorMessage.textContent = `Error deleting clip: ${error instanceof Error ? error.message : String(error)}`;
      errorNotification.classList.remove('hidden');
    }
  }
  
  private async handleFileImport(files: FileList): Promise<void> {
    try {
      debug('Importing files:', files.length);
      
      const loadingIndicator = document.getElementById('loading-indicator') as HTMLElement;
      loadingIndicator.classList.remove('hidden');
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        debug('Processing file:', file.name);
        
        if (file.type.startsWith('video/')) {
          const videoClip = await this.createVideoClip(file);
          this.clipPool.push(videoClip);
          this.renderClipPool();
          
          // Extract audio from video
          if (videoClip.hasAudio) {
            const audioClip = await this.extractAudioFromVideo(file, videoClip);
            this.clipPool.push(audioClip);
            this.renderClipPool();
          }
        } else if (file.type.startsWith('audio/')) {
          const audioClip = await this.createAudioClip(file);
          this.clipPool.push(audioClip);
          this.renderClipPool();
        } else {
          debug('Unsupported file type:', file.type);
        }
      }
      
      loadingIndicator.classList.add('hidden');
    } catch (error) {
      logError('Error importing files:', error);
      
      const loadingIndicator = document.getElementById('loading-indicator') as HTMLElement;
      loadingIndicator.classList.add('hidden');
      
      const errorNotification = document.getElementById('error-notification') as HTMLElement;
      const errorMessage = document.getElementById('error-message') as HTMLElement;
      errorMessage.textContent = `Error importing files: ${error instanceof Error ? error.message : String(error)}`;
      errorNotification.classList.remove('hidden');
    }
  }
  
  private renderClipPool(): void {
    const clipPoolEl = document.getElementById('clip-pool') as HTMLElement;
    clipPoolEl.innerHTML = '';
    
    this.clipPool.forEach(clip => {
      const clipEl = document.createElement('div');
      clipEl.className = `pool-clip ${clip instanceof VideoClip ? 'video' : 'audio'}`;
      clipEl.dataset.clipId = clip.id;
      
      const thumbnailEl = document.createElement('div');
      thumbnailEl.className = 'pool-clip-thumbnail';
      
      // Generate thumbnail for video clips
      if (clip instanceof VideoClip) {
        this.generateClipThumbnail(clip, thumbnailEl);
      } else if (clip instanceof AudioClip) {
        // Generate waveform visualization for audio clips
        this.generateClipWaveform(clip, thumbnailEl);
      }
      
      const typeEl = document.createElement('div');
      typeEl.className = 'pool-clip-type';
      typeEl.textContent = clip instanceof VideoClip ? 'Video' : 'Audio';
      
      const infoEl = document.createElement('div');
      infoEl.className = 'pool-clip-info';
      infoEl.textContent = clip.name;
      
      clipEl.appendChild(thumbnailEl);
      clipEl.appendChild(typeEl);
      clipEl.appendChild(infoEl);
      
      // Add click event to select the clip
      clipEl.addEventListener('click', () => {
        // Remove selected class from all clips
        clipPoolEl.querySelectorAll('.pool-clip').forEach(el => {
          el.classList.remove('selected');
        });
        
        // Add selected class to this clip
        clipEl.classList.add('selected');
        
        // Set the selected clip
        this.selectedPoolClip = clip;
        
        // Enable buttons
        this.addToTimelineBtn.disabled = false;
        this.deleteClipBtn.disabled = false;
      });
      
      clipPoolEl.appendChild(clipEl);
    });
  }
  
  private generateClipThumbnail(clip: VideoClip, container: HTMLElement): void {
    const videoEl = document.createElement('video');
    videoEl.src = clip.source;
    videoEl.currentTime = 0;
    
    videoEl.addEventListener('loadeddata', () => {
      // Generate thumbnail at 25% of the video duration
      videoEl.currentTime = videoEl.duration * 0.25;
    });
    
    videoEl.addEventListener('seeked', () => {
      // Create a canvas to capture the video frame
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the video frame on the canvas
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        
        // Set the thumbnail as background image
        try {
          const thumbnailUrl = canvas.toDataURL('image/jpeg');
          container.style.backgroundImage = `url(${thumbnailUrl})`;
        } catch (error) {
          logError('Error generating thumbnail:', error);
          // Fallback for thumbnail generation error
          container.style.backgroundColor = '#1a75ff';
        }
      }
    });
  }
  
  private generateClipWaveform(clip: AudioClip, container: HTMLElement): void {
    // Basic representation for audio clips
    // In a full implementation, this would generate a proper waveform visualization
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 40;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#4CAF50';
      
      // Draw a simple representation (not a real waveform)
      for (let i = 0; i < canvas.width; i += 3) {
        const height = Math.floor(Math.random() * 20) + 10;
        const y = (canvas.height - height) / 2;
        ctx.fillRect(i, y, 2, height);
      }
    }
  }
  
  private async createVideoClip(file: File): Promise<VideoClip> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      
      video.onloadedmetadata = () => {
        debug('Video metadata loaded:', file.name, video.duration, video.videoWidth, video.videoHeight);
        
        const videoClip = new VideoClip({
          id: `video-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: file.name,
          source: url,
          sourceFile: file,
          startTime: 0,
          endTime: video.duration,
          trackStartTime: 0,
          width: video.videoWidth,
          height: video.videoHeight,
          hasAudio: true // We'll check this by trying to extract audio
        });
        
        resolve(videoClip);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to load video metadata for ${file.name}`));
      };
      
      video.src = url;
    });
  }
  
  private async extractAudioFromVideo(file: File, videoClip: VideoClip): Promise<AudioClip> {
    // In a real implementation, we would use FFmpeg to extract audio
    // For now, we'll create a dummy audio clip with the same duration
    debug('Extracting audio from video:', file.name);
    
    return new AudioClip({
      id: `audio-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: `${file.name} (Audio)`,
      source: videoClip.source,
      sourceFile: file,
      startTime: 0,
      endTime: videoClip.endTime,
      trackStartTime: 0,
      linkedClipId: videoClip.id
    });
  }
  
  private async createAudioClip(file: File): Promise<AudioClip> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const audio = document.createElement('audio');
      
      audio.onloadedmetadata = () => {
        debug('Audio metadata loaded:', file.name, audio.duration);
        
        const audioClip = new AudioClip({
          id: `audio-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: file.name,
          source: url,
          sourceFile: file,
          startTime: 0,
          endTime: audio.duration,
          trackStartTime: 0
        });
        
        resolve(audioClip);
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to load audio metadata for ${file.name}`));
      };
      
      audio.src = url;
    });
  }
  
  private showExportDialog(): void {
    // Update export dialog with current timeline settings
    const resolutionSelect = document.getElementById('export-resolution') as HTMLSelectElement;
    const framerateSelect = document.getElementById('export-framerate') as HTMLSelectElement;
    
    // Set default values based on the timeline/project settings
    resolutionSelect.value = '1080p'; // Default or get from project settings
    framerateSelect.value = '30'; // Default or get from project settings
    
    // Show the dialog
    this.exportDialog.classList.remove('hidden');
  }
  
  private async startExport(): Promise<void> {
    try {
      if (!this.isFFmpegLoaded) {
        throw new Error('FFmpeg is not initialized - export functionality is limited');
      }
      
      const exportFormat = (document.getElementById('export-format') as HTMLSelectElement).value;
      const exportResolution = (document.getElementById('export-resolution') as HTMLSelectElement).value;
      const exportFramerate = parseInt((document.getElementById('export-framerate') as HTMLSelectElement).value, 10);
      const exportQuality = parseInt((document.getElementById('export-quality') as HTMLInputElement).value, 10);
      
      debug('Starting export with settings:', { exportFormat, exportResolution, exportFramerate, exportQuality });
      
      // Show progress UI
      const progressContainer = document.getElementById('export-progress') as HTMLElement;
      const progressFill = document.getElementById('progress-fill') as HTMLElement;
      const progressText = document.getElementById('progress-text') as HTMLElement;
      const exportConfirmBtn = document.getElementById('export-confirm-btn') as HTMLButtonElement;
      const exportCancelBtn = document.getElementById('export-cancel-btn') as HTMLButtonElement;
      
      progressContainer.classList.remove('hidden');
      exportConfirmBtn.disabled = true;
      exportCancelBtn.textContent = 'Cancel Export';
      
      // Configure the export dimensions
      let width: number;
      let height: number;
      
      switch (exportResolution) {
        case '720p':
          width = 1280;
          height = 720;
          break;
        case '4k':
          width = 3840;
          height = 2160;
          break;
        case '1080p':
        default:
          width = 1920;
          height = 1080;
          break;
      }
      
      // Start the export process
      await this.finalRenderer.exportVideo({
        clips: this.timeline.clips,
        width,
        height,
        frameRate: exportFramerate,
        format: exportFormat,
        quality: exportQuality,
        onProgress: (progress: number) => {
          // Update progress UI
          const percentage = Math.round(progress * 100);
          progressFill.style.width = `${percentage}%`;
          progressText.textContent = `${percentage}%`;
        }
      });
      
      // Reset UI when done
      progressContainer.classList.add('hidden');
      exportConfirmBtn.disabled = false;
      exportCancelBtn.textContent = 'Close';
      
      debug('Export completed successfully');
    } catch (error) {
      logError('Export failed:', error);
      
      // Reset UI
      const progressContainer = document.getElementById('export-progress') as HTMLElement;
      const exportConfirmBtn = document.getElementById('export-confirm-btn') as HTMLButtonElement;
      const exportCancelBtn = document.getElementById('export-cancel-btn') as HTMLButtonElement;
      
      progressContainer.classList.add('hidden');
      exportConfirmBtn.disabled = false;
      exportCancelBtn.textContent = 'Close';
      
      // Show error
      const errorNotification = document.getElementById('error-notification') as HTMLElement;
      const errorMessage = document.getElementById('error-message') as HTMLElement;
      errorMessage.textContent = `Export failed: ${error instanceof Error ? error.message : String(error)}`;
      errorNotification.classList.remove('hidden');
    }
  }
}
