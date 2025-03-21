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
      <header className="w-full flex justify-between items-center px-5 py-2 border-solid border-b-1 border-bordercolor">
        <h1 className="text-xl text-center">Browser Video Editor</h1>
        <Toolbar/>
        <ThemeToggleButton
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      </header>

      <div className="editor-container">
        <PreviewPlate/>
        <ClipPool/>
        <Timeline/>
      </div>

      <ExportDialog/>

      <div className="w-full flex justify-center">
        <FileInput onFileChange={onFileChange} />
      </div>

      <input type="file" id="file-input" accept="video/*,audio/*" multiple/>

      <div id="loading-indicator" className="loading-indicator hidden">
        <div className="spinner"></div>
        <p>Processing...</p>
      </div>

      <ErrorNotification/>




      <div className="w-full flex justify-center">
      
      {videoUrl && (
        <>
          <div className="">
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

      {videoUrl && (
        <>
          <div className="flex flex-col items-center justify-center w-full">
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

      </div>
    </>
  );
};

export default App;
