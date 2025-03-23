import React, { useEffect, useRef, useState } from 'react';
import { PreviewRenderer } from '../timeline/preview-renderer';
import { Timeline } from '../timeline/timeline';
import { useTimeline } from '../hooks/use-timeline';
import { usePlayback } from '../hooks/use-playback';

interface PreviewPlateProps {
  width: number;
  height: number;
  onExport?: () => void;
}

const PreviewPlate: React.FC<PreviewPlateProps> = ({ width, height, onExport }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PreviewRenderer | null>(null);
  const { timeline } = useTimeline();
  const { isPlaying, currentTime, play, pause, seek } = usePlayback();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current || !timeline) return;

    console.log('Initializing PreviewRenderer...');
    const renderer = new PreviewRenderer(canvasRef.current, timeline);
    rendererRef.current = renderer;

    // Set up time update callback
    renderer.onTimeUpdate = (time) => {
      seek(time);
    };

    setIsInitialized(true);

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up PreviewRenderer...');
      renderer.cleanup();
      rendererRef.current = null;
      setIsInitialized(false);
    };
  }, [canvasRef, timeline, seek]);

  // Handle playback state changes
  useEffect(() => {
    if (!rendererRef.current || !isInitialized) return;

    if (isPlaying) {
      rendererRef.current.play();
    } else {
      rendererRef.current.pause();
    }
  }, [isPlaying, isInitialized]);

  // Handle timeline updates
  useEffect(() => {
    if (!rendererRef.current || !timeline || !isInitialized) return;

    rendererRef.current.updateTimeline(timeline);
  }, [timeline, isInitialized]);

  // Handle export
  const handleExport = async () => {
    if (!rendererRef.current || !isInitialized) {
      console.error('Cannot export: PreviewRenderer not initialized');
      return;
    }

    try {
      setIsExporting(true);
      await rendererRef.current.exportVideo();
      if (onExport) {
        onExport();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="preview-plate">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000'
        }}
      />
      <div className="preview-controls">
        <button 
          onClick={isPlaying ? pause : play}
          disabled={!isInitialized || isExporting}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button 
          onClick={handleExport}
          disabled={!isInitialized || isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export Video'}
        </button>
      </div>
    </div>
  );
};

export default PreviewPlate;
