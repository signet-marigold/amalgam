import React, { useState, useRef, useEffect } from 'react';
import VideoPlayer from "./components/VideoPlayer";
import FileInput from "./components/FileInput";
import VolumeControl from "./components/VolumeControl";
import ThemeToggleButton from "./components/ThemeToggleButton";
import Toolbar from "./components/Toolbar";
import PreviewPlate from "./components/PreviewPlate";
import RenderPlate from "./components/RenderPlate";
import ClipPool from "./components/ClipPool";
import TimelineComponent from "./components/Timeline";
import { ExportDialog } from "./components/ExportDialog";
import ErrorNotification from "./components/ErrorNotification";
import useVideoEditor from "./hooks/useVideoEditor";
import useFFmpeg from "./hooks/useFFmpeg";
import { handleFileChange as processFile } from "./utils/fileUtils";
import { revokeAllBlobUrls } from "./utils/fileUtils";
import { Timeline } from './timeline/timeline';
import { PreviewRenderer } from './timeline/preview-renderer';
import { FinalRenderer } from './renderer/final-renderer';
import { debug, error as logError } from './utils/debug';
import { loadFFmpeg } from './utils/ffmpeg-utils';
import { VideoClip, AudioClip, Clip } from './timeline/clip';
import { Track, TrackType } from './timeline/track';
import './styles/export-dialog.css';

const App: React.FC = () => {
  const timelineRef = useRef<Timeline | null>(null);
  const previewRendererRef = useRef<PreviewRenderer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [volume, setVolume] = useState(1);
  const [clipPool, setClipPool] = useState<VideoClip[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    try {
      // Initialize timeline
      const timeline = new Timeline();
      timelineRef.current = timeline;

      // Initialize with an empty timeline
      const track = new Track(TrackType.Video);
      timeline.addTrack(track);
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize timeline:', error);
      setIsInitialized(false);
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  const handleClipSelect = (clip: VideoClip) => {
    if (!timelineRef.current) return;
    
    // Remove the clip from the clip pool
    setClipPool(prevPool => prevPool.filter(c => c.id !== clip.id) as VideoClip[]);
    
    // Add the clip to the timeline
    timelineRef.current.addClip(clip);
  };

  const handleFileChange = async (file: File) => {
    try {
      // Process the file and create a clip
      const clip = await processFile(file);
      
      // Add the clip to the clip pool
      setClipPool(prevPool => [...prevPool, clip] as VideoClip[]);
    } catch (error) {
      console.error('Error processing file:', error);
      // Handle error appropriately
    }
  };

  const handleClipDelete = (clip: VideoClip) => {
    if (!timelineRef.current) return;
    timelineRef.current.removeClip(clip.id);
  };

  const handleZoomIn = () => {
    if (timelineRef.current) {
      timelineRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (timelineRef.current) {
      timelineRef.current.zoomOut();
    }
  };

  // Handle file drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!timelineRef.current) return;

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('video/')) {
        try {
          const videoUrl = URL.createObjectURL(file);
          const video = document.createElement('video');
          video.src = videoUrl;
          await new Promise((resolve) => {
            video.onloadedmetadata = resolve;
          });

          const clip = new VideoClip({
            id: `clip-${Date.now()}`,
            name: file.name,
            source: videoUrl,
            sourceFile: file,
            startTime: 0,
            endTime: video.duration,
            trackStartTime: 0,
            width: video.videoWidth,
            height: video.videoHeight,
            hasAudio: true,
            duration: video.duration,
            trackId: timelineRef.current.tracks[0].id,
            type: TrackType.Video
          });

          timelineRef.current.addClip(clip);
        } catch (error) {
          debug('Error loading video:', error);
        }
      }
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (!timelineRef.current) return;

    if (isPlaying) {
      timelineRef.current.stopPlayback();
    } else {
      timelineRef.current.startPlayback();
    }
    setIsPlaying(!isPlaying);
  };

  const handleExportClick = () => {
    if (!previewRendererRef.current || !timelineRef.current) {
      console.error('Cannot export: PreviewRenderer or Timeline not initialized');
      return;
    }
    setShowExportDialog(true);
  };

  const handleCloseExportDialog = () => {
    setShowExportDialog(false);
  };

  // Add a callback to receive the PreviewRenderer instance from PreviewPlate
  const handlePreviewRendererInit = (renderer: PreviewRenderer) => {
    console.log('PreviewRenderer initialized');
    previewRendererRef.current = renderer;
    // Ensure timeline is set
    if (timelineRef.current) {
      renderer.setTimeline(timelineRef.current);
    }
  };

  // Update the timeline whenever it changes
  useEffect(() => {
    if (previewRendererRef.current && timelineRef.current) {
      previewRendererRef.current.setTimeline(timelineRef.current);
    }
  }, [timelineRef.current]);

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-background text-text">
      <Toolbar onFileChange={handleFileChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div 
          className="drop-zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="drop-zone-content">
            <p>Drag and drop video files here</p>
          </div>
        </div>
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            <PreviewPlate 
              timeline={timelineRef.current!} 
              onPreviewRendererInit={handlePreviewRendererInit}
            />
            <RenderPlate />
          </div>
          <ClipPool 
            clips={clipPool} 
            onClipSelect={handleClipSelect}
            onClipDelete={handleClipDelete}
          />
        </div>
        <TimelineComponent 
          timeline={timelineRef.current!}
        />
      </div>
      <ErrorNotification />
      <div className="flex justify-end p-4">
        <button
          onClick={handleExportClick}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Export Video
        </button>
      </div>
      {showExportDialog && previewRendererRef.current && (
        <ExportDialog
          previewRenderer={previewRendererRef.current}
          onClose={handleCloseExportDialog}
        />
      )}
    </div>
  );
};

export default App;
