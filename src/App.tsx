import React, { useState, useCallback, useEffect } from "react";
import FileInput from "./components/FileInput";
import ThemeToggleButton from "./components/ThemeToggleButton";
import Toolbar from "./components/Toolbar";
import PreviewPlate from "./components/PreviewPlate";
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

  return (
    <>
      <header className="w-full flex justify-between items-center px-5 py-2 border-solid border-b-1 border-bordercolor">
        <h1 className="text-xl text-center">Amalgam</h1>
        <Toolbar/>
        <ThemeToggleButton
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      </header>

      <div className="editor-container">
        <PreviewPlate
          handlePlayPause={handlePlayPause}
          handleVolumeChange={handleVolumeChange}
          videoUrl={videoUrl}
          playing={playing}
          volume={volume}
        />
        <ClipPool/>
        <Timeline/>
      </div>

      <ExportDialog/>

      <div className="w-full flex justify-center">
        <FileInput onFileChange={onFileChange} />
      </div>

      <div id="loading-indicator" className="loading-indicator hidden">
        <div className="spinner"></div>
        <p>Processing...</p>
      </div>

      <ErrorNotification/>
    </>
  );
};

export default App;
