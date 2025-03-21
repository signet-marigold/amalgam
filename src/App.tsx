import React, { useState, useCallback, useEffect } from "react";
import VideoPlayer from "./components/VideoPlayer";
import FileInput from "./components/FileInput";
import VolumeControl from "./components/VolumeControl";
import ThemeToggleButton from "./components/ThemeToggleButton";
import Toolbar from "./components/Toolbar";
import PreviewPlate from "./components/PreviewPlate";
import RenderPlate from "./components/RenderPlate";
import ClipPool from "./components/ClipPool";
import Timeline from "./components/Timeline";
import ExportDialog from "./components/ExportDialog";
import ErrorNotification from "./components/ErrorNotification";
import useVideoEditor from "./hooks/useVideoEditor";
import useFFmpeg from "./hooks/useFFmpeg";
import { handleFileChange as processFile } from "./utils/fileUtils";
import { revokeAllBlobUrls } from "./utils/fileUtils";
import { Timeline as TimelineClass } from './timeline/timeline';
import { PreviewRenderer } from './renderer/preview-renderer';
import { FinalRenderer } from './renderer/final-renderer';
import { debug, error as logError } from './utils/debug';
import { loadFFmpeg } from './utils/ffmpeg-utils';
import { VideoClip, AudioClip, Clip } from './timeline/clip';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [volume, setVolume] = useState(1);
  const [timeline, setTimeline] = useState<TimelineClass | null>(null);
  const [clipPool, setClipPool] = useState<VideoClip[]>([]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
  }, []);

  const handleClipSelect = useCallback((clip: VideoClip) => {
    if (!timeline) return;
    
    // Remove the clip from the clip pool
    setClipPool(prevPool => prevPool.filter(c => c.id !== clip.id) as VideoClip[]);
    
    // Add the clip to the timeline
    timeline.addClip(clip);
  }, [timeline]);

  const handleFileChange = useCallback(async (file: File) => {
    try {
      // Process the file and create a clip
      const clip = await processFile(file);
      
      // Add the clip to the clip pool
      setClipPool(prevPool => [...prevPool, clip] as VideoClip[]);
    } catch (error) {
      console.error('Error processing file:', error);
      // Handle error appropriately
    }
  }, []);

  const handleClipDelete = useCallback((clip: VideoClip) => {
    if (!timeline) return;
    timeline.removeClip(clip.id);
  }, [timeline]);

  const handleZoomIn = useCallback(() => {
    if (timeline) {
      timeline.zoomIn();
    }
  }, [timeline]);

  const handleZoomOut = useCallback(() => {
    if (timeline) {
      timeline.zoomOut();
    }
  }, [timeline]);

  useEffect(() => {
    // Initialize timeline
    const newTimeline = new TimelineClass();
    setTimeline(newTimeline);

    // Cleanup
    return () => {
      if (!newTimeline) return;
      
      // Stop playback if active
      if (newTimeline.isPlaying) {
        newTimeline.stopPlayback();
      }
      
      // Remove all clips from timeline
      newTimeline.clips.forEach(clip => {
        newTimeline.removeClip(clip.id);
      });
      
      // Clear tracks
      newTimeline.tracks.forEach(track => {
        const trackElement = document.getElementById(track.id);
        if (trackElement) {
          trackElement.remove();
        }
      });
      
      // Revoke all blob URLs
      revokeAllBlobUrls();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background text-text">
      <Toolbar onFileChange={handleFileChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {timeline && <PreviewPlate timeline={timeline} />}
        <ClipPool 
          clips={clipPool} 
          onClipSelect={handleClipSelect} 
          onClipDelete={handleClipDelete} 
        />
        {timeline && <Timeline timeline={timeline} />}
      </div>
      <ErrorNotification />
    </div>
  );
};

export default App;
