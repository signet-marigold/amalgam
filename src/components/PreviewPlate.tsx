import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PreviewRenderer } from '../timeline/preview-renderer';
import { Timeline } from '../timeline/timeline';
import { debug } from '../utils/debug';

interface PreviewPlateProps {
  timeline: Timeline;
}

const PreviewPlate: React.FC<PreviewPlateProps> = ({ timeline }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const previewRendererRef = useRef<PreviewRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Memoize the time update handler
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize the preview renderer
    const previewRenderer = new PreviewRenderer(canvasRef.current, timeline);
    previewRendererRef.current = previewRenderer;

    // Set up time update callback
    previewRenderer.setTimeUpdateCallback(handleTimeUpdate);

    // Set up timeline event listeners
    const handleClipRemoved = (e: CustomEvent) => {
      const clipId = e.detail.clipId;
      if (previewRendererRef.current) {
        previewRendererRef.current.cleanupVideoElement(clipId);
      }
    };

    document.getElementById('timeline')?.addEventListener('clipremoved', handleClipRemoved as EventListener);

    // Cleanup
    return () => {
      if (previewRendererRef.current) {
        previewRendererRef.current.stop();
      }
      document.getElementById('timeline')?.removeEventListener('clipremoved', handleClipRemoved as EventListener);
    };
  }, [timeline, handleTimeUpdate]);

  const handlePlayPause = () => {
    if (previewRendererRef.current) {
      if (isPlaying) {
        previewRendererRef.current.stop();
      } else {
        previewRendererRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Format time for display
  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <section className="preview-section">
      <div className="flex flex-col items-center p-4 space-y-4">
        <div className="relative">
          <canvas 
            ref={canvasRef}
            className="shadow-lg border border-bordercolor rounded-lg bg-black"
            style={{ width: '640px', height: '360px' }}
          />
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 px-4 py-2 rounded-lg">
            <button 
              className="text-white hover:text-gray-300 transition-colors"
              onClick={handlePlayPause}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div className="text-white font-mono">
              {formatTime(currentTime)} / {formatTime(timeline.duration)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PreviewPlate;
