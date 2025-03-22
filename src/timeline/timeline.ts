import { Clip, VideoClip, AudioClip } from './clip';
import { Track, TrackType } from './track';
import { debug, error as logError } from '../utils/debug';
import { EventEmitter } from './event-emitter';
import { formatTime } from '../utils/timeUtils';

export class Timeline extends EventEmitter {
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
  private _pixelsPerSecond: number = 5.56; // 1000 pixels for 3 minutes (180 seconds)
  private _minTickDistance: number = 50; // Minimum distance between ticks in pixels
  private _maxTickDensity: number = 20; // Maximum number of ticks per second
  private _selectedTrack: Track | null = null;

  constructor() {
    super();
  }

  public initialize(
    timelineElement: HTMLElement,
    rulerElement: HTMLElement,
    tracksContainer: HTMLElement
  ): void {
    this._timelineElement = timelineElement;
    this._rulerElement = rulerElement;
    this._tracksContainer = tracksContainer;

    // Create default tracks if they don't exist yet
      if (this._tracks.length === 0) {
        // Create default video track
      const videoTrack = new Track(TrackType.Video);
      videoTrack.id = 'video-track-1';
      videoTrack.name = 'Video 1';
      videoTrack.index = 0;
        this._tracks.push(videoTrack);

        // Create default audio track
      const audioTrack = new Track(TrackType.Audio);
      audioTrack.id = 'audio-track-1';
      audioTrack.name = 'Audio 1';
      audioTrack.index = 1;
        this._tracks.push(audioTrack);
    }

        // Create track elements in the DOM
        this._tracks.forEach(track => {
          debug('Created track:', track.name, `(${track.type})`);
          this.createTrackElement(track);
        });

    // Create playhead element
      this._playheadElement = document.createElement('div');
      this._playheadElement.className = 'playhead';
      this._timelineElement.appendChild(this._playheadElement);

    // Draw initial ruler
    this.drawRuler();

      // Set up event listeners
      this.setupEventListeners();
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
    this.emit('timeupdate', { time: this._currentTime });
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

    // Track selection and context menu
    this._timelineElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      
      const target = e.target as HTMLElement;
      const trackElement = target.closest('.track') as HTMLElement;
      
      if (trackElement) {
        const trackId = trackElement.getAttribute('data-track-id');
        const track = this._tracks.find(t => t.id === trackId);
        
        if (track) {
          this._selectedTrack = track;
          this.showTrackContextMenu(e.clientX, e.clientY);
        }
      }
    });

    // Close context menu when clicking outside
    document.addEventListener('click', () => {
      this.hideTrackContextMenu();
    });
  }

  private updateClipPosition(clip: Clip): void {
    if (!this._tracksContainer) return;

    const clipElement = this._tracksContainer.querySelector(`[data-clip-id="${clip.id}"]`) as HTMLElement;
    if (!clipElement) return;

    const x = this.timeToPixels(clip.trackStartTime);
    clipElement.style.left = `${x}px`;
  }

  addTrack(track: Track): void {
    this._tracks.push(track);
    this.emit('trackadded', { track });
  }

  removeTrack(trackId: string): void {
    const trackIndex = this._tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;

    // Remove all clips from this track
    this._clips = this._clips.filter(clip => clip.trackId !== trackId);
    
    // Remove the track
    this._tracks.splice(trackIndex, 1);
    
    this.emit('trackremoved', { trackId });
  }

  public addClip(clip: Clip): void {
    // Find the first available track of the same type
    let targetTrack = this._tracks.find(t => 
      t.type === clip.type && 
      !this.isTrackOccupiedAt(t, clip.trackStartTime, clip.duration)
    );

    // If no available track found, create a new one
    if (!targetTrack) {
      const newTrack = new Track(clip.type);
      newTrack.id = `${clip.type.toLowerCase()}-track-${this._tracks.length + 1}`;
      newTrack.name = `${clip.type} ${this._tracks.length + 1}`;
      newTrack.index = this._tracks.length;
      
      // Add the track to the timeline
      this.addTrack(newTrack);
      
      // Create the track element in the DOM
      this.createTrackElement(newTrack);
      
      targetTrack = newTrack;
    }

    // Set the clip's track ID and add it to the timeline
    clip.trackId = targetTrack.id;
    this._clips.push(clip);
    this._updateDuration();
    this.emit('clipadded', { clip });

    // Create the clip element in the DOM
    this.createClipElement(clip, targetTrack);
  }

  removeClip(clipId: string): void {
    const clipIndex = this._clips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) return;

    const clip = this._clips[clipIndex];
    const trackId = clip.trackId;
    
    // Remove the clip
    this._clips.splice(clipIndex, 1);
    
    // Remove the clip element from the DOM
    const clipElement = document.querySelector(`[data-clip-id="${clipId}"]`);
    if (clipElement) {
      clipElement.remove();
    }

    // Check if the track is empty (no more clips)
    const trackClips = this._clips.filter(c => c.trackId === trackId);
    if (trackClips.length === 0) {
      // Only remove the track if it's not one of the default tracks
      const track = this._tracks.find(t => t.id === trackId);
      if (track && !trackId.startsWith('video-track-1') && !trackId.startsWith('audio-track-1')) {
        this.removeTrack(trackId);
      }
    }

    this._updateDuration();
    this.emit('clipremoved', { clipId });
  }

  updateClipTime(clipId: string, newTime: number): void {
    const clip = this._clips.find(c => c.id === clipId);
    if (!clip) return;

    clip.trackStartTime = Math.max(0, newTime);
    this._updateDuration();
    this.emit('clipmoved', { clipId, newTime });
  }

  updateClipDuration(clipId: string, newDuration: number): void {
    const clip = this._clips.find(c => c.id === clipId);
    if (!clip) return;

    clip.duration = Math.max(0.1, newDuration);
    this._updateDuration();
    this.emit('clipresized', { clipId, newDuration });
  }

  startPlayback(): void {
    if (this._isPlaying) return;
    
    this._isPlaying = true;
    this._playbackStartTime = performance.now() - (this._currentTime * 1000);
    this.emit('playbackstarted', { time: this._currentTime });
  }

  stopPlayback(): void {
    if (!this._isPlaying) return;
    
    this._isPlaying = false;
    this.emit('playbackstopped', { time: this._currentTime });
  }

  private _updateDuration(): void {
    this._duration = Math.max(
      ...this._clips.map(clip => clip.trackStartTime + clip.duration)
    );
    this.emit('durationchanged', { duration: this._duration });
  }

  zoomIn(): void {
    this._pixelsPerSecond *= 1.2;
    this.updateTimelineScale();
    this.updateClipSizes();
    this.drawRuler();
  }

  zoomOut(): void {
    this._pixelsPerSecond /= 1.2;
    this.updateTimelineScale();
    this.updateClipSizes();
    this.drawRuler();
  }

  private updateTimelineScale(): void {
    if (!this._tracksContainer || !this._rulerElement) return;

    // Set the container to viewport width
    this._tracksContainer.style.width = '100%';
    this._rulerElement.style.width = '100%';

    // Update clip positions and sizes
    this.updateClipSizes();
  }

  private updateClipSizes(): void {
    this._clips.forEach(clip => {
      const clipElement = document.querySelector(`[data-clip-id="${clip.id}"]`);
      if (clipElement instanceof HTMLElement) {
        const start = this.timeToPixels(clip.startTime);
        const width = this.timeToPixels(clip.endTime - clip.startTime);
        clipElement.style.left = `${start}px`;
        clipElement.style.width = `${width}px`;
      }
    });
  }

  private isTrackOccupiedAt(track: Track, startTime: number, duration: number): boolean {
    const endTime = startTime + duration;

    // Get all clips in this track
    const trackClips = this._clips.filter(clip => clip.trackId === track.id);

    return trackClips.some(clip => {
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
      const videoTrack = new Track(TrackType.Video);
      videoTrack.id = 'video-track-1';
      videoTrack.name = 'Video 1';
      videoTrack.index = 0;
      this._tracks.push(videoTrack);

      // Create default audio track
      const audioTrack = new Track(TrackType.Audio);
      audioTrack.id = 'audio-track-1';
      audioTrack.name = 'Audio 1';
      audioTrack.index = 1;
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
    const clipStart = this.timeToPixels(clip.startTime);
    const clipWidth = this.timeToPixels(clip.endTime - clip.startTime);

    clipElement.style.left = `${clipStart}px`;
    clipElement.style.width = `${clipWidth}px`;

    // Clip content
    const clipContent = document.createElement('div');
    clipContent.className = 'clip-content';

    // Add clip name
    const nameElement = document.createElement('div');
    nameElement.className = 'clip-name';
    nameElement.textContent = clip.name;
    clipContent.appendChild(nameElement);

    // Add duration
    const durationElement = document.createElement('div');
    durationElement.className = 'clip-duration';
    durationElement.textContent = formatTime(clip.endTime - clip.startTime);
    clipContent.appendChild(durationElement);

    // Add resize handles
    const leftHandle = document.createElement('div');
    leftHandle.className = 'resize-handle left';
    leftHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.handleClipResize(clip, true, e);
    });

    const rightHandle = document.createElement('div');
    rightHandle.className = 'resize-handle right';
    rightHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.handleClipResize(clip, false, e);
    });

    // Add drag functionality
    clipElement.draggable = true;
    clipElement.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', clip.id);
    });

    // Assemble the clip element
    clipElement.appendChild(clipContent);
    clipElement.appendChild(leftHandle);
    clipElement.appendChild(rightHandle);
    trackContent.appendChild(clipElement);
  }

  private handleClipResize(clip: Clip, isLeft: boolean, e: MouseEvent): void {
    const startX = e.clientX;
    const startTime = isLeft ? clip.startTime : clip.endTime;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaTime = this.pixelsToTime(deltaX);
      const newTime = startTime + deltaTime;

      if (isLeft) {
        this.resizeClip(clip.id, newTime, clip.endTime, clip.trackId);
      } else {
        this.resizeClip(clip.id, clip.startTime, newTime, clip.trackId);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  private drawRuler(): void {
    if (!this._rulerElement) return;

    // Clear previous ruler content
    this._rulerElement.innerHTML = '';

    // Create a container for ticks
    const ticksContainer = document.createElement('div');
    ticksContainer.className = 'ruler-ticks';
    this._rulerElement.appendChild(ticksContainer);

    // Function to update ticks based on container width and zoom level
    const updateTicks = () => {
      const containerWidth = this._rulerElement!.clientWidth;
      const pixelsPerSecond = this._pixelsPerSecond;
      const visibleDuration = containerWidth / pixelsPerSecond;
      
      // Clear previous ticks
      ticksContainer.innerHTML = '';

      // Calculate tick intervals based on zoom level and minimum distance
      const baseInterval = 1; // 1 second base interval
      const pixelsPerInterval = baseInterval * pixelsPerSecond;
      
      // Scale minTickDistance and maxTickDensity based on zoom level
      const scaledMinTickDistance = this._minTickDistance * (1 / pixelsPerSecond);
      const scaledMaxTickDensity = this._maxTickDensity * pixelsPerSecond;
      
      // Calculate how many intervals we can fit with minimum distance
      const intervalsPerSecond = Math.min(
        scaledMaxTickDensity,
        Math.floor(pixelsPerSecond / scaledMinTickDistance)
      );

      // Determine major, minor, and sub-minor intervals
      let majorInterval = baseInterval;
      let minorInterval = baseInterval;
      let subMinorInterval = baseInterval;

      if (intervalsPerSecond >= 20) {
        majorInterval = 5; // 5 seconds
        minorInterval = 1; // 1 second
        subMinorInterval = 0.25; // 0.25 seconds
      } else if (intervalsPerSecond >= 10) {
        majorInterval = 5; // 5 seconds
        minorInterval = 1; // 1 second
        subMinorInterval = 0.5; // 0.5 seconds
      } else if (intervalsPerSecond >= 5) {
        majorInterval = 10; // 10 seconds
        minorInterval = 2; // 2 seconds
        subMinorInterval = 1; // 1 second
      } else if (intervalsPerSecond >= 2) {
        majorInterval = 30; // 30 seconds
        minorInterval = 5; // 5 seconds
        subMinorInterval = 1; // 1 second
      } else {
        majorInterval = 60; // 1 minute
        minorInterval = 15; // 15 seconds
        subMinorInterval = 5; // 5 seconds
      }

      const majorTickHeight = 20;
      const minorTickHeight = 15;
      const subMinorTickHeight = 10;

      // Draw major ticks
      for (let time = 0; time <= visibleDuration; time += majorInterval) {
        const x = time * pixelsPerSecond;
        const tick = document.createElement('div');
        tick.className = 'ruler-tick major';
        tick.style.left = `${x}px`;
        tick.style.height = `${majorTickHeight}px`;
        ticksContainer.appendChild(tick);

        // Add time label
      const label = document.createElement('div');
      label.className = 'ruler-label';
        label.textContent = formatTime(time);
        label.style.left = `${x}px`;
        ticksContainer.appendChild(label);
      }

      // Draw minor ticks
      for (let time = 0; time <= visibleDuration; time += minorInterval) {
        if (time % majorInterval !== 0) {
          const x = time * pixelsPerSecond;
          const tick = document.createElement('div');
          tick.className = 'ruler-tick minor';
          tick.style.left = `${x}px`;
          tick.style.height = `${minorTickHeight}px`;
          ticksContainer.appendChild(tick);
        }
      }

      // Draw sub-minor ticks
      for (let time = 0; time <= visibleDuration; time += subMinorInterval) {
        if (time % minorInterval !== 0) {
          const x = time * pixelsPerSecond;
          const tick = document.createElement('div');
          tick.className = 'ruler-tick sub-minor';
          tick.style.left = `${x}px`;
          tick.style.height = `${subMinorTickHeight}px`;
          ticksContainer.appendChild(tick);
        }
      }
    };

    // Initial update
    updateTicks();

    // Add resize observer to update ticks when container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateTicks();
    });

    resizeObserver.observe(this._rulerElement);

    // Store the observer for cleanup
    this._rulerElement.dataset.resizeObserver = resizeObserver.toString();
  }

  private updatePlayhead(): void {
    if (!this._playheadElement || !this._timelineElement) return;

    const x = (this._currentTime / this._duration) * this._timelineElement.clientWidth;
    this._playheadElement.style.left = `${x}px`;
  }

  private updateClipElement(clip: Clip): void {
    if (!this._tracksContainer) return;

    const clipElement = this._tracksContainer.querySelector(`[data-clip-id="${clip.id}"]`) as HTMLElement;
    if (!clipElement) return;

    const x = this.timeToPixels(clip.trackStartTime);
    const width = this.timeToPixels(clip.duration);

    clipElement.style.left = `${x}px`;
    clipElement.style.width = `${width}px`;
  }

  public timeToPixels(time: number): number {
    return time * this._pixelsPerSecond;
  }

  public pixelsToTime(pixels: number): number {
    return pixels / this._pixelsPerSecond;
  }

  public getClip(clipId: string): Clip | undefined {
    return this.clips.find(clip => clip.id === clipId);
  }

  public moveClip(clipId: string, newStartTime: number, trackId: string): void {
    const clip = this.getClip(clipId);
    if (!clip) return;

    const duration = clip.endTime - clip.startTime;
    clip.startTime = newStartTime;
    clip.endTime = newStartTime + duration;
    clip.trackId = trackId;
  }

  public resizeClip(clipId: string, newStartTime: number, newEndTime: number, trackId: string): void {
    const clip = this.getClip(clipId);
    if (!clip) return;

    clip.startTime = newStartTime;
    clip.endTime = newEndTime;
    clip.trackId = trackId;
  }

  private showTrackContextMenu(x: number, y: number): void {
    // Remove existing context menu if any
    this.hideTrackContextMenu();

    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'track-context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // Add menu items
    const removeClipButton = document.createElement('button');
    removeClipButton.textContent = 'Remove Clip';
    removeClipButton.onclick = () => {
      if (this._selectedTrack) {
        // Find all clips in this track
        const trackClips = this._clips.filter(clip => clip.trackId === this._selectedTrack!.id);
        
        // Remove all clips from this track
        trackClips.forEach(clip => {
          this.removeClip(clip.id);
        });
        
        // Remove the track if it's not one of the default tracks
        if (!this._selectedTrack.id.startsWith('video-track-1') && 
            !this._selectedTrack.id.startsWith('audio-track-1')) {
          this.removeTrack(this._selectedTrack.id);
        }
        
        this.hideTrackContextMenu();
      }
    };

    menu.appendChild(removeClipButton);
    document.body.appendChild(menu);
  }

  private hideTrackContextMenu(): void {
    const menu = document.querySelector('.track-context-menu');
    if (menu) {
      menu.remove();
    }
    this._selectedTrack = null;
  }

  get selectedTrack(): Track | null {
    return this._selectedTrack;
  }
}