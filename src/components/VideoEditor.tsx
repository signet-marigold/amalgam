import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { addClip, removeClip, updateClipTiming } from '../store/timelineSlice';
import { importClip } from '../store/clipManagerSlice';
import { setCurrentFrame, updateBuffer } from '../store/bufferSlice';
import { clearSavedState } from '../store/middleware/storage';
import { VideoWorkerMessage } from '../workers/videoWorker';

const VideoEditor: React.FC = () => {
  const dispatch = useDispatch();
  const timelineState = useSelector((state: RootState) => state.timeline);
  const bufferState = useSelector((state: RootState) => state.buffer);
  const clipManagerState = useSelector((state: RootState) => state.clipManager);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const animationFrameRef = useRef<number>();
  
  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/videoWorker', import.meta.url));
    workerRef.current.onmessage = handleWorkerMessage;
    
    workerRef.current.postMessage({
      type: 'init',
      payload: {
        width: timelineState.settings.resolution.width,
        height: timelineState.settings.resolution.height,
      },
    });
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);
  
  const handleWorkerMessage = (e: MessageEvent<VideoWorkerMessage>) => {
    const { type, payload } = e.data;
    
    switch (type) {
      case 'frameProcessed':
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx && payload.frame) {
            ctx.putImageData(payload.frame, 0, 0);
          }
        }
        break;
        
      case 'exportComplete':
        const url = URL.createObjectURL(payload);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'video-export.webm';
        a.click();
        URL.revokeObjectURL(url);
        break;
        
      case 'error':
        console.error('Worker error:', payload);
        break;
    }
  };
  
  const requestFrame = (time: number) => {
    workerRef.current?.postMessage({
      type: 'processFrame',
      payload: {
        clips: timelineState.clips,
        currentTime: time,
        settings: timelineState.settings,
      },
    });
  };
  
  const handlePlay = () => {
    setIsPlaying(true);
    let lastTime = performance.now();
    
    const animate = () => {
      const currentTime = performance.now();
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      dispatch(setCurrentFrame(
        Math.min(
          bufferState.currentFrame + delta * timelineState.settings.frameRate,
          bufferState.totalFrames - 1
        )
      ));
      
      requestFrame(bufferState.currentFrame / timelineState.settings.frameRate);
      
      if (bufferState.currentFrame >= bufferState.totalFrames - 1) {
        setIsPlaying(false);
        return;
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  };
  
  const handlePause = () => {
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };
  
  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(event.target.value);
    dispatch(setCurrentFrame(Math.floor(time * timelineState.settings.frameRate)));
    requestFrame(time);
  };
  
  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.multiple = true;
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      
      for (const file of Array.from(files)) {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = reject;
          video.src = url;
        });
        
        dispatch(importClip({
          sourceUrl: url,
          duration: video.duration,
          metadata: {
            width: video.videoWidth,
            height: video.videoHeight,
            frameRate: 30, // Assuming 30fps
            format: file.type,
          },
        }));
      }
    };
    
    input.click();
  };
  
  const handleExport = () => {
    workerRef.current?.postMessage({
      type: 'export',
      payload: {
        clips: timelineState.clips,
        settings: timelineState.settings,
      },
    });
  };
  
  const handleNewProject = () => {
    if (window.confirm('Start new project? This will clear the current timeline.')) {
      clearSavedState();
      window.location.reload();
    }
  };
  
  return (
    <div className="video-editor">
      <div className="preview">
        <canvas
          ref={canvasRef}
          width={timelineState.settings.resolution.width}
          height={timelineState.settings.resolution.height}
        />
        <div className="controls">
          <button onClick={isPlaying ? handlePause : handlePlay}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <input
            type="range"
            min="0"
            max={timelineState.duration}
            step="0.001"
            value={bufferState.currentFrame / timelineState.settings.frameRate}
            onChange={handleSeek}
          />
          <span>
            {(bufferState.currentFrame / timelineState.settings.frameRate).toFixed(2)}s
            / {timelineState.duration.toFixed(2)}s
          </span>
        </div>
      </div>
      
      <div className="timeline">
        <div className="clips">
          {timelineState.clips.map((clip) => (
            <div
              key={clip.id}
              className="clip"
              style={{
                left: `${(clip.startTime / timelineState.duration) * 100}%`,
                width: `${(clip.duration / timelineState.duration) * 100}%`,
              }}
            >
              <div className="clip-info">
                <span>{clip.id}</span>
                <button onClick={() => dispatch(removeClip(clip.id))}>×</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="toolbar">
        <button onClick={handleImport}>Import Clips</button>
        <button onClick={handleExport}>Export Video</button>
        <button onClick={handleNewProject}>New Project</button>
      </div>
      
      <style jsx>{`
        .video-editor {
          display: flex;
          flex-direction: column;
          height: 100vh;
          padding: 20px;
          background: #1e1e1e;
          color: white;
        }
        
        .preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 20px;
        }
        
        canvas {
          max-width: 100%;
          background: black;
        }
        
        .controls {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
        }
        
        .timeline {
          flex: 1;
          background: #2d2d2d;
          border-radius: 4px;
          padding: 10px;
          overflow-x: auto;
        }
        
        .clips {
          position: relative;
          height: 100px;
          background: #3d3d3d;
          border-radius: 2px;
        }
        
        .clip {
          position: absolute;
          height: 100%;
          background: #4a9eff;
          border-radius: 2px;
          cursor: move;
        }
        
        .clip-info {
          padding: 4px;
          font-size: 12px;
          display: flex;
          justify-content: space-between;
        }
        
        .toolbar {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        
        button {
          padding: 8px 16px;
          background: #4a9eff;
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
        }
        
        button:hover {
          background: #3d8aee;
        }
        
        input[type="range"] {
          flex: 1;
        }
      `}</style>
    </div>
  );
};

export default VideoEditor; 