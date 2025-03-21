import { Clip, VideoClip, AudioClip } from './clip';
import { Track, TrackType } from './track';
import { debug, error as logError } from '../utils/debug';

export class Timeline {
  private _tracks: Track[] = [];
  private _clips: Clip[] = [];
  private _duration: number = 0;
  private _currentTime: number = 0;
  private _scale: number = 1.0; // Zoom level
  private _timelineElement: HTMLElement;
  private _tracksContainer: HTMLElement;
  private _rulerElement: HTMLElement;
  private _playheadElement: HTMLElement | null = null;
  private _isDragging: boolean = false;
  private _draggedClip: Clip | null = null;
  private _lastMouseX: number = 0;

  constructor() {
    this._timelineElement = document.getElementById('timeline') as HTMLElement;
    this._tracksContainer = document.getElementById('timeline-tracks') as HTMLElement;
    this._rulerElement = document.getElementById('timeline-ruler') as HTMLElement;
  }

  async initialize(): Promise<void> {
    debug('Initializing timeline...');

    try {
      // Create initial tracks if they don't exist yet
      if (this._tracks.length === 0) {
        // Create default video track
        const videoTrack = new Track({
          id: 'video-track-1',
          name: 'Video 1',
          type: TrackType.Video,
          index: 0
        });
        this._tracks.push(videoTrack);

        // Create default audio track
        const audioTrack = new Track({
          id: 'audio-track-1',
          name: 'Audio 1',
          type: TrackType.Audio,
          index: 1
        });
        this._tracks.push(audioTrack);

        // Create track elements in the DOM
        this._tracks.forEach(track => {
          debug('Created track:', track.name, `(${track.type})`);
          this.createTrackElement(track);
        });
      }

      // Create the playhead
      this._playheadElement = document.createElement('div');
      this._playheadElement.className = 'playhead';
      this._timelineElement.appendChild(this._playheadElement);

      // Set up event listeners
      this.setupEventListeners();

      // Draw the initial timeline
      this.drawRuler();

      debug('Timeline initialized successfully');
    } catch (error) {
      logError('Failed to initialize timeline:', error);
      throw new Error(`Failed to initialize timeline: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  get tracks(): Track[] {
    return this._tracks;
  }

  get clips(): Clip[] {
    return this._clips;
  }

  get duration(): number {
    return this._duration;
  }

  get currentTime(): number {
    return this._currentTime;
  }

  set currentTime(time: number) {
    this._currentTime = Math.max(0, Math.min(time, this._duration));
    this.updatePlayhead();

    // Dispatch time update event
    const event = new CustomEvent('timeupdate', { detail: { time: this._currentTime } });
    this._timelineElement.dispatchEvent(event);
  }

  private setupEventListeners(): void {
    // Timeline click event for positioning playhead
    this._timelineElement.addEventListener('click', (e) => {
      if (e.target === this._timelineElement || e.target === this._rulerElement || e.target === this._tracksContainer) {
        const rect = this._timelineElement.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newTime = this.pixelToTime(clickX);
        this.currentTime = newTime;
      }
    });

    // Playhead drag functionality
    if (this._playheadElement) {
      let isPlayheadDragging = false;

      this._playheadElement.addEventListener('mousedown', (e) => {
        isPlayheadDragging = true;
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
        e.stopPropagation();
      });

      document.addEventListener('mousemove', (e) => {
        if (isPlayheadDragging) {
          const rect = this._timelineElement.getBoundingClientRect();
          const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
          const newTime = this.pixelToTime(clickX);
          this.currentTime = newTime;
          e.preventDefault();
        }
      });

      document.addEventListener('mouseup', () => {
        if (isPlayheadDragging) {
          isPlayheadDragging = false;
          document.body.style.cursor = '';
        }
      });
    }

    // Clip drag events
    this._timelineElement.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      const clipElement = target.closest('.clip') as HTMLElement;

      if (clipElement) {
        this._isDragging = true;
        this._lastMouseX = e.clientX;

        const clipId = clipElement.getAttribute('data-clip-id');
        if (clipId) {
          this._draggedClip = this._clips.find(clip => clip.id === clipId) || null;
        }

        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this._isDragging && this._draggedClip) {
        const deltaX = e.clientX - this._lastMouseX;
        this._lastMouseX = e.clientX;

        // Convert pixel movement to time
        const deltaTime = this.pixelToTime(deltaX);

        // Move the clip
        this._draggedClip.trackStartTime = Math.max(0, this._draggedClip.trackStartTime + deltaTime);

        // Update the clip element position
        this.updateClipElement(this._draggedClip);

        e.preventDefault();
      }
    });

    document.addEventListener('mouseup', () => {
      if (this._isDragging) {
        this._isDragging = false;
        this._draggedClip = null;
      }
    });

    // Add keyboard shortcuts for timeline navigation
    document.addEventListener('keydown', (e) => {
      // Only respond if we're not in an input field
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          // Left arrow: move back one frame
          this.currentTime = Math.max(0, this._currentTime - (1/30));
          e.preventDefault();
          break;
        case 'ArrowRight':
          // Right arrow: move forward one frame
          this.currentTime = Math.min(this._duration, this._currentTime + (1/30));
          e.preventDefault();
          break;
        case 'Home':
          // Home: go to beginning
          this.currentTime = 0;
          e.preventDefault();
          break;
        case 'End':
          // End: go to end
          this.currentTime = this._duration;
          e.preventDefault();
          break;
      }
    });
  }

  addClip(clip: Clip): void {
    debug('Adding clip to timeline:', clip.name);

    // Find appropriate track for the clip
    let track: Track | undefined;

    if (clip instanceof VideoClip) {
      track = this._tracks.find(t => t.type === TrackType.Video && !this.isTrackOccupiedAt(t, clip.trackStartTime, clip.duration));
    } else if (clip instanceof AudioClip) {
      track = this._tracks.find(t => t.type === TrackType.Audio && !this.isTrackOccupiedAt(t, clip.trackStartTime, clip.duration));
    }

    // If no suitable track found, create a new one
    if (!track) {
      const trackType = clip instanceof VideoClip ? TrackType.Video : TrackType.Audio;
      const tracksOfType = this._tracks.filter(t => t.type === trackType);

      track = new Track({
        id: `${trackType.toLowerCase()}-track-${tracksOfType.length + 1}`,
        name: `${trackType} ${tracksOfType.length + 1}`,
        type: trackType,
        index: this._tracks.length
      });

      this._tracks.push(track);
      this.createTrackElement(track);
    }

    // Add clip to track
    track.addClip(clip);
    this._clips.push(clip);

    // Create the clip element in the DOM
    this.createClipElement(clip, track);

    // Update timeline duration if needed
    const clipEndTime = clip.trackStartTime + clip.duration;
    if (clipEndTime > this._duration) {
      this._duration = clipEndTime;
      this.drawRuler(); // Update the ruler if duration changed
    }
  }

  removeClip(clipId: string): void {
    const clipIndex = this._clips.findIndex(c => c.id === clipId);

    if (clipIndex !== -1) {
      const clip = this._clips[clipIndex];

      // Remove clip from its track
      const track = this._tracks.find(t => t.clips.some(c => c.id === clipId));
      if (track) {
        track.removeClip(clipId);
      }

      // Remove clip from the timeline
      this._clips.splice(clipIndex, 1);

      // Remove clip element from DOM
      const clipElement = document.querySelector(`[data-clip-id="${clipId}"]`);
      if (clipElement) {
        clipElement.remove();
      }

      // Update timeline duration if needed
      this.recalculateDuration();
    }
  }

  splitClipAtPlayhead(): void {
    const currentTime = this._currentTime;

    // Find clips that are currently active at the playhead position
    const clipsAtPlayhead = this._clips.filter(clip => {
      const clipStart = clip.trackStartTime;
      const clipEnd = clipStart + clip.duration;
      return currentTime > clipStart && currentTime < clipEnd;
    });

    for (const clip of clipsAtPlayhead) {
      debug(`Splitting clip ${clip.id} at ${currentTime}`);

      // Calculate relative position within the clip
      const relativePosition = currentTime - clip.trackStartTime;

      // Create two new clips from the original
      const splitPoint = clip.startTime + relativePosition;

      if (clip instanceof VideoClip) {
        // First part (before split)
        const firstClip = new VideoClip({
          id: `${clip.id}-part1`,
          name: `${clip.name} (Part 1)`,
          source: clip.source,
          sourceFile: clip.sourceFile,
          startTime: clip.startTime,
          endTime: splitPoint,
          trackStartTime: clip.trackStartTime,
          width: clip.width,
          height: clip.height,
          hasAudio: clip.hasAudio
        });

        // Second part (after split)
        const secondClip = new VideoClip({
          id: `${clip.id}-part2`,
          name: `${clip.name} (Part 2)`,
          source: clip.source,
          sourceFile: clip.sourceFile,
          startTime: splitPoint,
          endTime: clip.endTime,
          trackStartTime: currentTime,
          width: clip.width,
          height: clip.height,
          hasAudio: clip.hasAudio
        });

        // Remove the original clip
        this.removeClip(clip.id);

        // Add the new clips
        this.addClip(firstClip);
        this.addClip(secondClip);

      } else if (clip instanceof AudioClip) {
        // First part (before split)
        const firstClip = new AudioClip({
          id: `${clip.id}-part1`,
          name: `${clip.name} (Part 1)`,
          source: clip.source,
          sourceFile: clip.sourceFile,
          startTime: clip.startTime,
          endTime: splitPoint,
          trackStartTime: clip.trackStartTime,
          linkedClipId: clip.linkedClipId
        });

        // Second part (after split)
        const secondClip = new AudioClip({
          id: `${clip.id}-part2`,
          name: `${clip.name} (Part 2)`,
          source: clip.source,
          sourceFile: clip.sourceFile,
          startTime: splitPoint,
          endTime: clip.endTime,
          trackStartTime: currentTime,
          linkedClipId: clip.linkedClipId
        });

        // Remove the original clip
        this.removeClip(clip.id);

        // Add the new clips
        this.addClip(firstClip);
        this.addClip(secondClip);
      }
    }
  }

  zoomIn(): void {
    this._scale *= 1.2;
    this.updateTimelineScale();
  }

  zoomOut(): void {
    this._scale /= 1.2;
    this.updateTimelineScale();
  }

  private updateTimelineScale(): void {
    // Update ruler
    this.drawRuler();

    // Update clip positions
    this._clips.forEach(clip => {
      this.updateClipElement(clip);
    });

    // Update playhead
    this.updatePlayhead();
  }

  private isTrackOccupiedAt(track: Track, startTime: number, duration: number): boolean {
    const endTime = startTime + duration;

    return track.clips.some(clip => {
      const clipStart = clip.trackStartTime;
      const clipEnd = clipStart + clip.duration;

      // Check if the time ranges overlap
      return (startTime < clipEnd && endTime > clipStart);
    });
  }

  private recalculateDuration(): void {
    if (this._clips.length === 0) {
      this._duration = 0;
    } else {
      const maxEndTime = Math.max(...this._clips.map(clip => clip.trackStartTime + clip.duration));
      this._duration = maxEndTime;
    }

    this.drawRuler();
  }

  private pixelToTime(pixels: number): number {
    const timelineWidth = this._timelineElement.clientWidth;
    return (pixels / timelineWidth) * this._duration * (1 / this._scale);
  }

  private timeToPixel(time: number): number {
    const timelineWidth = this._timelineElement.clientWidth;
    return (time / this._duration) * timelineWidth * this._scale;
  }

  private createTrackElement(track: Track): void {
    // Check if track element already exists
    const existingTrackElement = document.getElementById(track.id);
    if (existingTrackElement) {
      // For existing elements, ensure they have track-content div
      if (!existingTrackElement.querySelector('.track-content')) {
        const trackContent = document.createElement('div');
        trackContent.className = 'track-content';
        existingTrackElement.appendChild(trackContent);
      }

      // If there's a track header, ensure it has the right name
      const trackHeader = existingTrackElement.querySelector('.track-header');
      if (trackHeader) {
        trackHeader.textContent = track.name;
      } else {
        // Add track header if missing
        const header = document.createElement('div');
        header.className = 'track-header';
        header.textContent = track.name;
        existingTrackElement.insertBefore(header, existingTrackElement.firstChild);
      }
      return;
    }

    // Create track element
    const trackElement = document.createElement('div');
    trackElement.id = track.id;
    trackElement.className = `track ${track.type.toLowerCase()}-track`;
    trackElement.setAttribute('data-track-id', track.id);
    trackElement.innerHTML = `<div class="track-header">${track.name}</div><div class="track-content"></div>`;

    // Add track element to timeline
    this._tracksContainer.appendChild(trackElement);
  }

  private createClipElement(clip: Clip, track: Track): void {
    // Get track element
    const trackElement = document.getElementById(track.id);
    if (!trackElement) {
      logError(`Track element ${track.id} not found`);
      return;
    }

    // Get track content container
    const trackContent = trackElement.querySelector('.track-content');
    if (!trackContent) {
      logError(`Track content not found in ${track.id}`);
      return;
    }

    // Create clip element
    const clipElement = document.createElement('div');
    clipElement.className = `clip ${clip instanceof VideoClip ? 'video-clip' : 'audio-clip'}`;
    clipElement.setAttribute('data-clip-id', clip.id);

    // Position the clip
    const clipStart = this.timeToPixel(clip.trackStartTime);
    const clipWidth = this.timeToPixel(clip.duration);

    clipElement.style.left = `${clipStart}px`;
    clipElement.style.width = `${clipWidth}px`;

    // Clip content
    let clipContent = '';

    if (clip instanceof VideoClip) {
      // For video clips, we'll show a thumbnail and name
      clipContent = `
        <div class="clip-thumbnail"></div>
        <div class="clip-info">
          <div class="clip-name">${clip.name}</div>
          <div class="clip-time">${this.formatTime(clip.duration)}</div>
        </div>
      `;

      // Generate thumbnail using the video source
      setTimeout(() => {
        this.generateThumbnail(clip as VideoClip, clipElement.querySelector('.clip-thumbnail') as HTMLElement);
      }, 100);

    } else if (clip instanceof AudioClip) {
      // For audio clips, we'll show a waveform and name
      clipContent = `
        <div class="clip-waveform"></div>
        <div class="clip-info">
          <div class="clip-name">${clip.name}</div>
          <div class="clip-time">${this.formatTime(clip.duration)}</div>
        </div>
      `;

      // Generate waveform
      setTimeout(() => {
        this.generateWaveform(clip as AudioClip, clipElement.querySelector('.clip-waveform') as HTMLElement);
      }, 100);
    }

    clipElement.innerHTML = clipContent;

    // Add clip element to track
    trackContent.appendChild(clipElement);

    // Add clip resize handles
    const leftHandle = document.createElement('div');
    leftHandle.className = 'clip-handle clip-handle-left';
    clipElement.appendChild(leftHandle);

    const rightHandle = document.createElement('div');
    rightHandle.className = 'clip-handle clip-handle-right';
    clipElement.appendChild(rightHandle);

    // Set up drag events for resize handles
    this.setupResizeHandles(clipElement, clip);
  }

  private updateClipElement(clip: Clip): void {
    const clipElement = document.querySelector(`[data-clip-id="${clip.id}"]`) as HTMLElement;
    if (!clipElement) {
      return;
    }

    // Update position and width
    const clipStart = this.timeToPixel(clip.trackStartTime);
    const clipWidth = this.timeToPixel(clip.duration);

    clipElement.style.left = `${clipStart}px`;
    clipElement.style.width = `${clipWidth}px`;

    // Update time display
    const timeElement = clipElement.querySelector('.clip-time');
    if (timeElement) {
      timeElement.textContent = this.formatTime(clip.duration);
    }
  }

  private setupResizeHandles(clipElement: HTMLElement, clip: Clip): void {
    const leftHandle = clipElement.querySelector('.clip-handle-left') as HTMLElement;
    const rightHandle = clipElement.querySelector('.clip-handle-right') as HTMLElement;

    let isDragging = false;
    let startMouseX = 0;
    let originalClipStart = 0;
    let originalClipEnd = 0;
    let activeHandle: HTMLElement | null = null;

    const startDrag = (e: MouseEvent, handle: HTMLElement): void => {
      isDragging = true;
      startMouseX = e.clientX;
      activeHandle = handle;
      originalClipStart = clip.trackStartTime;
      originalClipEnd = clip.trackStartTime + clip.duration;

      e.preventDefault();
      e.stopPropagation();
    };

    leftHandle.addEventListener('mousedown', (e) => startDrag(e, leftHandle));
    rightHandle.addEventListener('mousedown', (e) => startDrag(e, rightHandle));

    document.addEventListener('mousemove', (e) => {
      if (!isDragging || !activeHandle) return;

      const deltaX = e.clientX - startMouseX;
      const deltaTime = this.pixelToTime(deltaX);

      if (activeHandle === leftHandle) {
        // Resize from left (change start time)
        const newStartTime = Math.max(0, originalClipStart + deltaTime);
        const newDuration = Math.max(0.1, originalClipEnd - newStartTime);

        clip.startTime += deltaTime;
        clip.trackStartTime = newStartTime;
        clip.duration = newDuration;
      } else if (activeHandle === rightHandle) {
        // Resize from right (change duration)
        const newDuration = Math.max(0.1, clip.duration + deltaTime);
        clip.duration = newDuration;
      }

      this.updateClipElement(clip);
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        activeHandle = null;
      }
    });
  }

  private generateThumbnail(clip: VideoClip, container: HTMLElement): void {
    const video = document.createElement('video');
    video.src = clip.source;

    video.onloadeddata = () => {
      // Set the current time to the middle of the clip for a good thumbnail
      video.currentTime = clip.startTime + (clip.duration / 2);
    };

    video.onseeked = () => {
      // Create a canvas to capture the video frame
      const canvas = document.createElement('canvas');
      canvas.width = 160; // Thumbnail width
      canvas.height = 90; // Thumbnail height

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Set the canvas as background of the thumbnail container
        container.style.backgroundImage = `url(${canvas.toDataURL()})`;

        // Clean up
        URL.revokeObjectURL(video.src);
      }
    };

    video.onerror = () => {
      console.error('Error generating thumbnail');
      // Set a default background
      container.style.backgroundColor = '#333';
      container.innerText = 'No Preview';
    };
  }

  private generateWaveform(clip: AudioClip, container: HTMLElement): void {
    // In a real app, we would use the Web Audio API to analyze the audio
    // and generate a waveform. For simplicity, we'll just create a fake waveform.
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#4CAF50';

      // Generate random "waveform" data
      const barCount = 50;
      const barWidth = canvas.width / barCount;

      for (let i = 0; i < barCount; i++) {
        const barHeight = Math.random() * canvas.height * 0.8;
        const x = i * barWidth;
        const y = (canvas.height - barHeight) / 2;

        ctx.fillRect(x, y, barWidth - 1, barHeight);
      }

      container.appendChild(canvas);
    }
  }

  private drawRuler(): void {
    const rulerWidth = this._timelineElement.clientWidth;
    this._rulerElement.innerHTML = '';

    // Determine time interval based on duration and scale
    const intervals = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60]; // In seconds
    const pixelsPerSecond = rulerWidth / (this._duration * (1 / this._scale));

    // Find appropriate interval that will result in markers not too close to each other
    const minPixelsBetweenMarkers = 50;
    let interval = intervals[0];

    for (let i = 0; i < intervals.length; i++) {
      if (intervals[i] * pixelsPerSecond >= minPixelsBetweenMarkers) {
        interval = intervals[i];
        break;
      }
    }

    // Draw ruler markers
    for (let time = 0; time <= this._duration; time += interval) {
      const markerX = this.timeToPixel(time);

      const marker = document.createElement('div');
      marker.className = 'ruler-marker';
      marker.style.left = `${markerX}px`;

      const label = document.createElement('div');
      label.className = 'ruler-label';
      label.textContent = this.formatTime(time);

      marker.appendChild(label);
      this._rulerElement.appendChild(marker);
    }
  }

  private updatePlayhead(): void {
    if (!this._playheadElement) return;

    const playheadX = this.timeToPixel(this._currentTime);
    this._playheadElement.style.left = `${playheadX}px`;

    // Update or create the cursor controls if they don't exist
    let cursorControls = document.querySelector('.timeline-cursor-controls');
    if (!cursorControls) {
      cursorControls = document.createElement('div');
      cursorControls.className = 'timeline-cursor-controls';

      // Skip backward 5 sec button
      const skipBackBtn = document.createElement('button');
      skipBackBtn.className = 'timeline-cursor-btn';
      skipBackBtn.innerHTML = '⏪';
      skipBackBtn.title = 'Skip back 5 seconds';
      skipBackBtn.addEventListener('click', () => {
        this.currentTime = Math.max(0, this._currentTime - 5);
      });

      // Step backward 1 frame button
      const stepBackBtn = document.createElement('button');
      stepBackBtn.className = 'timeline-cursor-btn';
      stepBackBtn.innerHTML = '◀';
      stepBackBtn.title = 'Previous frame';
      stepBackBtn.addEventListener('click', () => {
        // Move one frame back (assuming 30fps)
        this.currentTime = Math.max(0, this._currentTime - (1/30));
      });

      // Step forward 1 frame button
      const stepForwardBtn = document.createElement('button');
      stepForwardBtn.className = 'timeline-cursor-btn';
      stepForwardBtn.innerHTML = '▶';
      stepForwardBtn.title = 'Next frame';
      stepForwardBtn.addEventListener('click', () => {
        // Move one frame forward (assuming 30fps)
        this.currentTime = Math.min(this._duration, this._currentTime + (1/30));
      });

      // Skip forward 5 sec button
      const skipForwardBtn = document.createElement('button');
      skipForwardBtn.className = 'timeline-cursor-btn';
      skipForwardBtn.innerHTML = '⏩';
      skipForwardBtn.title = 'Skip forward 5 seconds';
      skipForwardBtn.addEventListener('click', () => {
        this.currentTime = Math.min(this._duration, this._currentTime + 5);
      });

      // Add all buttons to the controls
      cursorControls.appendChild(skipBackBtn);
      cursorControls.appendChild(stepBackBtn);
      cursorControls.appendChild(stepForwardBtn);
      cursorControls.appendChild(skipForwardBtn);

      // Add the controls to the timeline
      this._timelineElement.appendChild(cursorControls);
    }
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
}
