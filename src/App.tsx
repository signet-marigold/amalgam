import React, { useState, useEffect, useCallback } from "react";
import ReactPlayer from "react-player";
import { Button } from "antd";
import useVideoEditor, { Clip } from "./hooks/useVideoEditor";
import { FFmpeg } from "@ffmpeg/ffmpeg";

const App: React.FC = () => {
  const [ffmpeg, setFFmpeg] = useState<FFmpeg | null>(null);
  const [isFFmpegLoading, setIsFFmpegLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);

  // Set dark mode on the entire document
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.style.backgroundColor = '#121212';
    document.body.style.color = 'white';
    
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  // Initialize FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpegInstance = new FFmpeg();
      try {
        await ffmpegInstance.load({
          coreURL:
            "https://unpkg.com/@ffmpeg/core@v0.12.6/dist/ffmpeg-core.js",
          wasmURL:
            "https://unpkg.com/@ffmpeg/core@v0.12.6/dist/ffmpeg-core.wasm"
        });
        setFFmpeg(ffmpegInstance);
      } catch (error) {
        console.error("Error loading FFmpeg:", error);
      } finally {
        setIsFFmpegLoading(false);
      }
    };

    loadFFmpeg();
  }, []);

  // The hook always returns an object with 'clips' and a function 'addClip'
  const [{ clips }, { addClip }] = useVideoEditor(ffmpeg);

  // Handler for file input change
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a temporary URL for the selected video
      setVideoUrl(URL.createObjectURL(file));
      addClip(file);
    }
  };

  const handlePlayPause = useCallback(() => {
    setPlaying((prevPlaying) => !prevPlaying);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value / 100);
  }, []);

  if (isFFmpegLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#121212] text-white">
        <div>Loading ...</div>
      </div>
    );
  }

  return (
    <>
    <h1 className="text-2xl font-bold text-center">Amalgam</h1>

    <div className="w-full flex justify-center">
      <input
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="bg-[#2a2a2a] text-white px-4 py-2 rounded-md"
      />
    </div>

    {videoUrl && (
      <>
        <div className="w-full flex justify-center">
          <div className="w-[640px] h-[360px]">
            <ReactPlayer
              url={videoUrl}
              playing={playing}
              volume={volume}
              width="640px"
              height="360px"
              controls
              className="rounded-md overflow-hidden"
            />
          </div>
        </div>
        
        <div className="mt-4 flex flex-col items-center justify-center w-full">
          <Button
            onClick={handlePlayPause}
            style={{
              backgroundColor: '#1a1a1a',
              borderColor: '#333',
              color: 'white'
            }}
          >
            {playing ? "Pause" : "Play"}
          </Button>
          
          <div className="w-40 p-4">
            <label className="text-sm text-gray-300 mr-2 mt-5"></label>
            <input
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              onChange={handleVolumeChange}
              style={{
                accentColor: '#3b82f6',
                backgroundColor: '#333'
              }}
              className="w-full h-2 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </>
    )}
    </>
  );
};

export default App;
