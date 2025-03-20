import React, { useState, useEffect, useCallback } from "react";
import { Button } from "antd";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import VideoPlayer from "./components/VideoPlayer";
import FileInput from "./components/FileInput";
import VolumeControl from "./components/VolumeControl";
import useVideoEditor from "./hooks/useVideoEditor";

const App: React.FC = () => {
  const [ffmpeg, setFFmpeg] = useState<FFmpeg | null>(null);
  const [isFFmpegLoading, setIsFFmpegLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);

  // Set dark mode on the entire document
  useEffect(() => {
    document.body.classList.remove('preload-style'); // Remove init styles
  }, []);

  // Initialize FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpegInstance = new FFmpeg();
      try {
        await ffmpegInstance.load();
        setFFmpeg(ffmpegInstance);
      } catch (error) {
        console.error("Error loading FFmpeg:", error);
      } finally {
        setIsFFmpegLoading(false);
      }
    };

    loadFFmpeg();
  }, []);

  const [{ clips }, { addClip }] = useVideoEditor(ffmpeg);

  const handleFileChange = async (file: File) => {
    if (file) {
      setVideoUrl(URL.createObjectURL(file));
      const fileData = await fetchFile(file);
      const newFile = new File([fileData], file.name, { type: file.type });
      addClip(newFile);
    }
  };

  const handlePlayPause = useCallback(() => {
    setPlaying((prevPlaying) => !prevPlaying);
  }, []);

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
  }, []);

  if (isFFmpegLoading) {
    return (
      <div className="flex items-center justify-center text-xl min-h-screen">
        <p className="text-xl">Loading ...</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-center">Amalgam</h1>
      <div className="w-full flex justify-center">
        <FileInput onFileChange={handleFileChange} />
      </div>

      {videoUrl && (
        <>
          <div className="w-full flex justify-center">
            <VideoPlayer url={videoUrl} playing={playing} volume={volume} />
          </div>
          
          <div className="mt-4 flex flex-col items-center justify-center w-full bg-skin-muted">
            <Button
              onClick={handlePlayPause}
              className="bg-base border-border text-foreground"
            >
              {playing ? "Pause" : "Play"}
            </Button>
            
            <VolumeControl volume={volume} onVolumeChange={handleVolumeChange} />
          </div>
        </>
      )}
    </>
  );
};

export default App;
