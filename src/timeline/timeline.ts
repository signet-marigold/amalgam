import { Clip, VideoClip, AudioClip } from './clip';
import { Track, TrackType } from './track';
import { debug, error as logError } from '../utils/debug';

export class Timeline {
  private _tracks: Track[] = [];
  private _clips: Clip[] = [];
  private _duration: number = 0;
  private _currentTime: number = 0;
  private _scale: number = 1.0; // Zoom level
  private _timelineElement: HTMLElement | null = null;
  private _tracksContainer: HTMLElement | null = null;
  private _rulerElement: HTMLElement | null = null;
  private _playheadElement: HTMLElement | null = null;
  private _isDragging: boolean = false;
  private _draggedClip: Clip | null = null;
  private _lastMouseX: number = 0;
  private _isPlaying: boolean = false;
  private _playbackStartTime: number = 0;
  private _timelineStartTime: number = 0;
  private _animationFrameId: number | null = null;
  private _previewRenderer: any = null; // Reference to the preview renderer

  constructor() {
    // Initialize empty timeline
  }

  public initialize(timelineElement: HTMLElement): void {
    this._timelineElement = timelineElement;
    
    const tracksContainer = timelineElement.querySelector('.tracks-container') as HTMLElement;
    const rulerElement = timelineElement.querySelector('.timeline-ruler') as HTMLElement;
    const playheadElement = timelineElement.querySelector('.playhead') as HTMLElement;

    if (!tracksContainer || !rulerElement || !playheadElement) {
      throw new Error('Required timeline elements not found');
    }

    this._tracksContainer = tracksContainer;
    this._rulerElement = rulerElement;
    this._playheadElement = playheadElement;

    this.setupEventListeners();
    this.drawRuler();
    this.createTrackElements();
  }

  public setScale(newScale: number): void {
    this._scale = Math.max(0.1, Math.min(10, newScale));
    this.updateTimelineScale();
    this.updateClipSizes();

    // Dispatch scale change event
    if (this._timelineElement) {
      const event = new CustomEvent('scalechange', {
        detail: { scale: this._scale }
      });
      this._timelineElement.dispatchEvent(event);
    }
  }

  get scale(): number {
    return this._scale;
  }

  get currentTime(): number {
    return this._currentTime;
  }

  set currentTime(value: number) {
    this._currentTime = Math.max(0, Math.min(this._duration, value));
    this.updatePlayhead();

    // Dispatch time update event
    if (this._timelineElement) {
      const event = new CustomEvent('timeupdate', {
        detail: { time: this._currentTime }
      });
      this._timelineElement.dispatchEvent(event);
    }
  }

  get duration(): number {
    return this._duration;
  }

  get tracks(): Track[] {
    return this._tracks;
  }

  get clips(): Clip[] {
    return this._clips;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  public setPreviewRenderer(renderer: any): void {
    this._previewRenderer = renderer;
  }

  private setupEventListeners(): void {
    if (!this._timelineElement) return;

    // Timeline click event for positioning playhead
    this._timelineElement.addEventListener('click', (e) => {
      if (!this._timelineElement || !this._rulerElement || !this._tracksContainer) return;
      
      if (e.target === this._timelineElement || e.target === this._rulerElement || e.target === this._tracksContainer) {
        const rect = this._timelineElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = this.pixelsToTime(x);
        this.currentTime = time;
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
        if (isPlayheadDragging && this._timelineElement) {
          const rect = this._timelineElement.getBoundingClientRect();
          const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
          const newTime = this.pixelsToTime(clickX);
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
      if (!this._timelineElement) return;
      
      const target = e.target as HTMLElement;
      const clipElement = target.closest('.clip') as HTMLElement;
      if (clipElement) {
        const clipId = clipElement.dataset.clipId;
        const clip = this._clips.find(c => c.id === clipId);
        if (clip) {
          this._isDragging = true;
          this._draggedClip = clip;
          this._lastMouseX = e.clientX;
        }
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this._isDragging || !this._draggedClip || !this._timelineElement) return;

      const rect = this._timelineElement.getBoundingClientRect();
      const deltaX = e.clientX - this._lastMouseX;
      const deltaTime = this.pixelsToTime(deltaX);

      this._draggedClip.trackStartTime += deltaTime;
      this._lastMouseX = e.clientX;

      this.updateClipPosition(this._draggedClip);
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

  private updateClipPosition(clip: Clip): void {
    if (!this._tracksContainer) return;

    const clipElement = this._tracksContainer.querySelector(`[data-clip-id="${clip.id}"]`) as HTMLElement;
    if (!clipElement) return;

    const x = this.timeToPixels(clip.trackStartTime);
    clipElement.style.left = `${x}px`;
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

      // Clean up video element in preview renderer if it exists
      if (this._previewRenderer) {
        this._previewRenderer.cleanupVideoElement(clipId);
      }

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

      // Dispatch clipremoved event
      if (this._timelineElement) {
        const event = new CustomEvent('clipremoved', {
          detail: { clipId }
        });
        this._timelineElement.dispatchEvent(event);
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
    if (!this._timelineElement || !this._tracksContainer) return;

    const scale = this._scale;
    this._timelineElement.style.transform = `scaleX(${scale})`;
    this._tracksContainer.style.transform = `scaleX(${scale})`;

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
    const timelineWidth = this._timelineElement!.clientWidth;
    return (pixels / timelineWidth) * this._duration * (1 / this._scale);
  }

  private timeToPixel(time: number): number {
    const timelineWidth = this._timelineElement!.clientWidth;
    return (time / this._duration) * timelineWidth * this._scale;
  }

  private createTrackElements(): void {
    if (!this._tracksContainer) return;

    // Create default tracks if they don't exist yet
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
    }

    // Create track elements in the DOM
    this._tracks.forEach(track => {
      debug('Created track:', track.name, `(${track.type})`);
      this.createTrackElement(track);
    });
  }

  private createTrackElement(track: Track): void {
    // Check if track element already exists
    const existingTrackElement = document.getElementById(track.id);
    if (existingTrackElement) {
      track.element = existingTrackElement;
      
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
    trackElement.draggable = true; // Enable drag and drop
    trackElement.innerHTML = `<div class="track-header">${track.name}</div><div class="track-content"></div>`;

    // Set the element property on the track instance
    track.element = trackElement;

    // Add drag and drop event listeners
    trackElement.addEventListener('dragstart', (e) => {
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', track.id);
        trackElement.classList.add('dragging');
      }
    });

    trackElement.addEventListener('dragend', () => {
      trackElement.classList.remove('dragging');
    });

    trackElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingElement = document.querySelector('.dragging') as HTMLElement;
      if (draggingElement && draggingElement !== trackElement) {
        const rect = trackElement.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dropPosition = e.clientY < midY ? 'before' : 'after';
        
        // Remove any existing drop indicators
        document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
        
        // Add drop indicator
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        if (dropPosition === 'before') {
          trackElement.parentNode?.insertBefore(indicator, trackElement);
        } else {
          trackElement.parentNode?.insertBefore(indicator, trackElement.nextSibling);
        }
      }
    });

    trackElement.addEventListener('dragleave', () => {
      document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    });

    trackElement.addEventListener('drop', (e) => {
      e.preventDefault();
      document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
      
      const draggedTrackId = e.dataTransfer?.getData('text/plain');
      if (!draggedTrackId) return;

      const draggedTrack = this._tracks.find(t => t.id === draggedTrackId);
      const dropTarget = this._tracks.find(t => t.id === track.id);
      
      if (draggedTrack && dropTarget && draggedTrack !== dropTarget) {
        const draggedIndex = this._tracks.indexOf(draggedTrack);
        const dropIndex = this._tracks.indexOf(dropTarget);
        
        // Remove dragged track from array
        this._tracks.splice(draggedIndex, 1);
        
        // Insert at new position
        const newIndex = dropIndex + (e.clientY > dropTarget.element?.getBoundingClientRect().top! + dropTarget.element?.getBoundingClientRect().height! / 2 ? 1 : 0);
        this._tracks.splice(newIndex, 0, draggedTrack);
        
        // Update track indices
        this._tracks.forEach((t, index) => {
          t.index = index;
        });
        
        // Reorder DOM elements
        const draggedElement = document.getElementById(draggedTrackId);
        const dropElement = document.getElementById(dropTarget.id);
        
        if (draggedElement && dropElement) {
          const rect = dropElement.getBoundingClientRect();
          const dropPosition = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
          
          if (dropPosition === 'before') {
            dropElement.parentNode?.insertBefore(draggedElement, dropElement);
          } else {
            dropElement.parentNode?.insertBefore(draggedElement, dropElement.nextSibling);
          }
        }
      }
    });

    // Add track element to timeline
    this._tracksContainer!.appendChild(trackElement);
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
        <div class="clip-thumbnail">
          <img src="${clip.source}" alt="${clip.name}" />
        </div>
        <div class="clip-name">${clip.name}</div>
      `;
    } else if (clip instanceof AudioClip) {
      // For audio clips, we'll show a waveform and name
      clipContent = `
        <div class="clip-waveform">
          <div class="waveform-container"></div>
        </div>
        <div class="clip-name">${clip.name}</div>
      `;
    }

    clipElement.innerHTML = clipContent;
    trackContent.appendChild(clipElement);
  }

  private drawRuler(): void {
    if (!this._rulerElement) return;

    const rulerWidth = this._rulerElement.clientWidth;
    const majorTickInterval = 1; // 1 second
    const minorTickInterval = 0.25; // 0.25 seconds
    const pixelsPerSecond = rulerWidth / this._duration;
    const majorTickWidth = 2;
    const minorTickWidth = 1;
    const tickHeight = 20;

    // Clear previous ruler content
    this._rulerElement.innerHTML = '';

    // Draw major ticks (seconds)
    for (let time = 0; time <= this._duration; time += majorTickInterval) {
      const x = (time / this._duration) * rulerWidth;
      const tick = document.createElement('div');
      tick.className = 'ruler-tick major';
      tick.style.left = `${x}px`;
      tick.style.width = `${majorTickWidth}px`;
      tick.style.height = `${tickHeight}px`;
      this._rulerElement.appendChild(tick);

      // Add time label
      const label = document.createElement('div');
      label.className = 'ruler-label';
      label.textContent = time.toFixed(0);
      label.style.left = `${x - 10}px`;
      label.style.top = `${tickHeight + 2}px`;
      this._rulerElement.appendChild(label);
    }

    // Draw minor ticks (0.25 seconds)
    for (let time = 0; time <= this._duration; time += minorTickInterval) {
      if (time % majorTickInterval !== 0) {
        const x = (time / this._duration) * rulerWidth;
        const tick = document.createElement('div');
        tick.className = 'ruler-tick minor';
        tick.style.left = `${x}px`;
        tick.style.width = `${minorTickWidth}px`;
        tick.style.height = `${tickHeight / 2}px`;
        this._rulerElement.appendChild(tick);
      }
    }
  }

  private updatePlayhead(): void {
    if (!this._playheadElement || !this._timelineElement) return;

    const x = (this._currentTime / this._duration) * this._timelineElement.clientWidth;
    this._playheadElement.style.left = `${x}px`;
  }

  private updateClipSizes(): void {
    if (!this._tracksContainer) return;

    this._clips.forEach(clip => {
      const clipElement = this._tracksContainer!.querySelector(`[data-clip-id="${clip.id}"]`) as HTMLElement;
      if (clipElement) {
        const width = this.timeToPixel(clip.duration);
        clipElement.style.width = `${width}px`;
      }
    });
  }

  private updateClipElement(clip: Clip): void {
    if (!this._tracksContainer) return;

    const clipElement = this._tracksContainer.querySelector(`[data-clip-id="${clip.id}"]`) as HTMLElement;
    if (!clipElement) return;

    const x = this.timeToPixel(clip.trackStartTime);
    const width = this.timeToPixel(clip.duration);

    clipElement.style.left = `${x}px`;
    clipElement.style.width = `${width}px`;
  }

  private pixelsToTime(pixels: number): number {
    return this.pixelToTime(pixels);
  }

  private timeToPixels(time: number): number {
    return this.timeToPixel(time);
  }
}