import React, { useState, useCallback, useEffect } from "react";
import VideoPlayer from "./components/VideoPlayer";
import FileInput from "./components/FileInput";
import VolumeControl from "./components/VolumeControl";
import ThemeToggleButton from "./components/ThemeToggleButton";
import useVideoEditor from "./hooks/useVideoEditor";
import useFFmpeg from "./hooks/useFFmpeg";
import { handleFileChange } from "./utils/fileUtils";

const App: React.FC = () => {
  const { ffmpeg, isFFmpegLoading } = useFFmpeg();

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [{ clips }, { addClip }] = useVideoEditor(ffmpeg);

  useEffect(() => {
    document.body.classList.remove('preload-style');
    document.documentElement.classList.toggle(
      "dark",
      localStorage.theme === "dark" ||
        (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches),
    );

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  const toggleDarkMode = () => {
    localStorage.setItem('theme', !isDarkMode ? 'dark' : 'light');
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark", !isDarkMode);
  };

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
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading ...</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-center">Amalgam</h1>
      
      <div className="w-full flex justify-center">
        <FileInput onFileChange={onFileChange} />
      </div>

       <ThemeToggleButton
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />
      
      {videoUrl && (
        <>
          <div className="w-full flex justify-center">
            <VideoPlayer url={videoUrl} playing={playing} volume={volume} />
          </div>
          <div className="flex flex-col items-center justify-center w-full space-y-4">
            <button
              onClick={handlePlayPause}
              className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <VolumeControl volume={volume} onVolumeChange={handleVolumeChange} />
          </div>
        </>
      )}
    </>
  );
};

export default App;
