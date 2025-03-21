import React, { useEffect, useRef, useState } from 'react';
import { Timeline as TimelineClass } from '../timeline/timeline';
import { Track, TrackType } from '../timeline/track';
import { debug } from '../utils/debug';

interface TimelineProps {
  timeline: TimelineClass;
}

const Timeline: React.FC<TimelineProps> = ({ timeline }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);

  useEffect(() => {
    if (!timelineRef.current) return;

    const timelineElement = timelineRef.current;
    const tracksContainer = timelineElement.querySelector('.tracks-container');
    const ruler = timelineElement.querySelector('.timeline-ruler');

    if (!tracksContainer || !ruler) return;

    // Initialize timeline
    timeline.initialize(timelineElement);

    // Handle timeline events
    const handleTimeUpdate = (e: CustomEvent) => {
      const time = e.detail.time;
      updatePlayheadPosition(time);
      updateTimeDisplay(time);
    };

    const handleScaleChange = (e: CustomEvent) => {
      setScale(e.detail.scale);
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only respond if we're not in an input field
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }

      switch (e.key) {
        case ' ':
          // Space: toggle play/pause
          e.preventDefault();
          if (timeline.isPlaying) {
            timeline.stopPlayback();
          } else {
            timeline.startPlayback();
          }
          break;
        case 'ArrowLeft':
          // Left arrow: move back one frame
          e.preventDefault();
          timeline.currentTime = Math.max(0, timeline.currentTime - (1/30));
          break;
        case 'ArrowRight':
          // Right arrow: move forward one frame
          e.preventDefault();
          timeline.currentTime = Math.min(timeline.duration, timeline.currentTime + (1/30));
          break;
        case 'Home':
          // Home: go to beginning
          e.preventDefault();
          timeline.currentTime = 0;
          break;
        case 'End':
          // End: go to end
          e.preventDefault();
          timeline.currentTime = timeline.duration;
          break;
        case 'S':
          // S: split clip at playhead
          e.preventDefault();
          timeline.splitClipAtPlayhead();
          break;
      }
    };

    timelineElement.addEventListener('timeupdate', handleTimeUpdate as EventListener);
    timelineElement.addEventListener('scalechange', handleScaleChange as EventListener);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      timelineElement.removeEventListener('timeupdate', handleTimeUpdate as EventListener);
      timelineElement.removeEventListener('scalechange', handleScaleChange as EventListener);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [timeline]);

  const updatePlayheadPosition = (time: number) => {
    if (!timelineRef.current) return;

    const playhead = timelineRef.current.querySelector('.playhead');
    if (!playhead) return;

    const position = time * scale * 100; // Convert time to pixels
    (playhead as HTMLElement).style.left = `${position}px`;
  };

  const updateTimeDisplay = (time: number) => {
    if (!timelineRef.current) return;

    const timeDisplay = timelineRef.current.querySelector('.time-display');
    if (!timeDisplay) return;

    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;

    // Check if clicking on a clip
    const target = e.target as HTMLElement;
    const clipElement = target.closest('.clip') as HTMLElement;
    
    if (clipElement) {
      const clipId = clipElement.dataset.clipId;
      if (clipId) {
        setSelectedClip(clipId);
      }
    }

    setIsDragging(true);
    setStartX(e.pageX - timelineRef.current.offsetLeft);
    setScrollLeft(timelineRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;

    e.preventDefault();
    const x = e.pageX - timelineRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    timelineRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setSelectedClip(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(10, scale * delta));
      setScale(newScale);
      timeline.setScale(newScale);
    }
  };

  return (
    <div 
      ref={timelineRef}
      className="timeline-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div className="timeline-ruler">
        {/* Ruler marks will be added dynamically */}
      </div>
      <div className="tracks-container">
        {/* Track elements will be added dynamically */}
      </div>
      <div className="playhead" />
      <div className="time-display">00:00:00</div>
      <div className="timeline-controls">
        <button 
          className="timeline-btn"
          onClick={() => timeline.currentTime = Math.max(0, timeline.currentTime - 5)}
          title="Skip back 5 seconds"
        >
          ⏪
        </button>
        <button 
          className="timeline-btn"
          onClick={() => timeline.currentTime = Math.max(0, timeline.currentTime - (1/30))}
          title="Previous frame"
        >
          ◀
        </button>
        <button 
          className="timeline-btn"
          onClick={() => timeline.currentTime = Math.min(timeline.duration, timeline.currentTime + (1/30))}
          title="Next frame"
        >
          ▶
        </button>
        <button 
          className="timeline-btn"
          onClick={() => timeline.currentTime = Math.min(timeline.duration, timeline.currentTime + 5)}
          title="Skip forward 5 seconds"
        >
          ⏩
        </button>
        <button 
          className="timeline-btn"
          onClick={() => timeline.splitClipAtPlayhead()}
          title="Split clip at playhead (S)"
        >
          ✂
        </button>
      </div>
    </div>
  );
};

export default Timeline;
