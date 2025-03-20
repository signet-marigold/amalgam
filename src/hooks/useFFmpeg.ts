import { useState, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { loadFFmpeg } from "../utils/ffmpeg-utils";

const useFFmpeg = () => {
  const [ffmpeg, setFFmpeg] = useState<FFmpeg | null>(null);
  const [isFFmpegLoading, setIsFFmpegLoading] = useState(true);

  useEffect(() => {
    const initializeFFmpeg = async () => {
      setIsFFmpegLoading(true);
      try {
        const ffmpegInstance = await loadFFmpeg();
        setFFmpeg(ffmpegInstance);
      } catch (error) {
        console.error("Failed to load FFmpeg:", error);
      } finally {
        setIsFFmpegLoading(false);
      }
    };

    initializeFFmpeg();
  }, []);

  return { ffmpeg, isFFmpegLoading };
};

export default useFFmpeg;

