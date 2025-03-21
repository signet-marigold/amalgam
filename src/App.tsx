// src/App.tsx
import React, { useState, useCallback, useEffect } from "react";
import VideoPlayer from "./components/VideoPlayer";
import FileInput from "./components/FileInput";
import VolumeControl from "./components/VolumeControl";
import ThemeToggleButton from "./components/ThemeToggleButton";
import useVideoEditor from "./hooks/useVideoEditor";
import useFFmpeg from "./hooks/useFFmpeg";
import { handleFileChange } from "./utils/fileUtils";

const darkIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
</svg>`;

const lightIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
</svg>`;

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
