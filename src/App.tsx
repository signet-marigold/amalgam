// src/App.tsx
import React, { useState, useCallback, useEffect } from "react";
import { Button } from "antd";
import VideoPlayer from "./components/VideoPlayer";
import FileInput from "./components/FileInput";
import VolumeControl from "./components/VolumeControl";
import useVideoEditor from "./hooks/useVideoEditor";
import useFFmpeg from "./hooks/useFFmpeg";
import { enableDarkMode } from "./utils/darkmode";
import { handleFileChange } from "./utils/fileUtils";

const App: React.FC = () => {
  const { ffmpeg, isFFmpegLoading } = useFFmpeg();
  useEffect(() => enableDarkMode(), []);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);

  const [{ clips }, { addClip }] = useVideoEditor(ffmpeg);

  const onFileChange = async (file: File) => {
    await handleFileChange(file, setVideoUrl, addClip);
  };

  const handlePlayPause = useCallback(() => {
    setPlaying((prevPlaying) => !prevPlaying);
  }, []);

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
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
        <FileInput onFileChange={onFileChange} />
      </div>
      {videoUrl && (
        <>
          <div className="w-full flex justify-center">
            <VideoPlayer url={videoUrl} playing={playing} volume={volume} />
          </div>
          <div className="flex flex-col items-center justify-center w-full space-y-4">
            <Button
              onClick={handlePlayPause}
              style={{
                backgroundColor: "#1a1a1a",
                borderColor: "#333",
                color: "white",
              }}
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
