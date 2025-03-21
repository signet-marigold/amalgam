import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Timeline } from '../timeline/timeline';
import { Track, TrackType } from '../timeline/track';
import { debug } from '../utils/debug';
import { Clip } from '../timeline/clip';
import { formatTime } from '../utils/timeUtils';
import '../styles/timeline.css';

interface TimelineProps {
  timeline: Timeline;
}

const TimelineComponent: React.FC<TimelineProps> = ({ timeline }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !rulerRef.current || !tracksRef.current) return;

    // Initialize timeline with DOM elements
    timeline.initialize(
      containerRef.current,
      rulerRef.current,
      tracksRef.current
    );

    const handleScroll = () => {
      if (rulerRef.current && tracksRef.current) {
        rulerRef.current.scrollLeft = tracksRef.current.scrollLeft;
      }
    };

    tracksRef.current.addEventListener('scroll', handleScroll);
    return () => {
      if (tracksRef.current) {
        tracksRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [timeline]);

  // Handle timeline time updates
  useEffect(() => {
    const handleTimeUpdate = (data: { time: number }) => {
      setCurrentTime(data.time);
    };

    timeline.on('timeupdate', handleTimeUpdate);
    return () => {
      timeline.off('timeupdate', handleTimeUpdate);
    };
  }, [timeline]);

  // Handle zoom changes
  const handleZoom = useCallback((delta: number) => {
    if (delta > 0) {
      timeline.zoomIn();
    } else {
      timeline.zoomOut();
    }
  }, [timeline]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  // Handle clip drag start
  const handleClipDragStart = (e: React.DragEvent, clip: Clip) => {
    e.dataTransfer.setData('text/plain', clip.id);
  };

  // Handle clip drag over
  const handleClipDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle clip drop
  const handleClipDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const clipId = e.dataTransfer.getData('text/plain');
    const clip = timeline.getClip(clipId);
    if (!clip) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = timeline.pixelsToTime(x);
    
    timeline.moveClip(clip.id, time, clip.trackId);
  };

  // Handle clip drag
  const handleClipDrag = useCallback((e: React.DragEvent) => {
    if (!isDragging || !draggedClipId) return;

    const deltaX = e.clientX - dragStartX;
    const deltaTime = deltaX / (zoom * 100); // Convert pixels to time
    const newTime = dragStartTime + deltaTime;

    timeline.updateClipTime(draggedClipId, newTime);
  }, [isDragging, draggedClipId, dragStartX, dragStartTime, zoom, timeline]);

  // Handle clip drag end
  const handleClipDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedClipId(null);
  }, []);

  // Handle clip resize start
  const handleClipResizeStart = (e: React.MouseEvent, clip: Clip, isLeft: boolean) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startTime = isLeft ? clip.startTime : clip.endTime;
    const startWidth = clip.endTime - clip.startTime;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaTime = timeline.pixelsToTime(deltaX);
      const newTime = startTime + deltaTime;

      if (isLeft) {
        timeline.resizeClip(clip.id, newTime, clip.endTime, clip.trackId);
      } else {
        timeline.resizeClip(clip.id, clip.startTime, newTime, clip.trackId);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Render time markers
  const renderTimeMarkers = useCallback(() => {
    const duration = timeline.duration;
    const markers = [];
    const interval = Math.max(1, Math.floor(10 / zoom)); // Adjust interval based on zoom

    for (let time = 0; time <= duration; time += interval) {
      const x = time * zoom * 100;
      markers.push(
        <div
          key={time}
          className="absolute h-full border-l border-gray-300"
          style={{ left: `${x}px` }}
        >
          <div className="absolute -top-6 left-0 text-xs text-gray-500">
            {formatTime(time)}
          </div>
        </div>
      );
    }

    return markers;
  }, [timeline.duration, zoom]);

  return (
    <div className="timeline-container" ref={containerRef}>
      <div className="timeline-ruler" ref={rulerRef}>
        <div className="relative h-6 bg-gray-100">
          {renderTimeMarkers()}
        </div>
      </div>
      <div className="tracks-container" ref={tracksRef}>
        {timeline.tracks.map(track => (
          <div
            key={track.id}
            className="track"
            onDragOver={handleClipDragOver}
            onDrop={handleClipDrop}
          >
            {track.clips.map(clip => (
              <div
                key={clip.id}
                className="clip"
                style={{
                  left: `${timeline.timeToPixels(clip.startTime)}px`,
                  width: `${timeline.timeToPixels(clip.endTime - clip.startTime)}px`,
                }}
                draggable
                onDragStart={(e) => handleClipDragStart(e, clip)}
              >
                <div className="clip-content">
                  <div className="clip-name">{clip.name}</div>
                  <div className="clip-duration">
                    {formatTime(clip.endTime - clip.startTime)}
                  </div>
                </div>
                <div
                  className="resize-handle left"
                  onMouseDown={(e) => handleClipResizeStart(e, clip, true)}
                />
                <div
                  className="resize-handle right"
                  onMouseDown={(e) => handleClipResizeStart(e, clip, false)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div
        className="playhead"
        style={{
          left: `${timeline.timeToPixels(timeline.currentTime)}px`,
        }}
      />
      <div className="zoom-controls">
        <button onClick={() => handleZoom(1)}>+</button>
        <button onClick={() => handleZoom(-1)}>-</button>
      </div>
    </div>
  );
};

export default TimelineComponent;
