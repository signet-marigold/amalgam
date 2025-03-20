import { FFmpeg } from "@ffmpeg/ffmpeg";

export const loadFFmpeg = async (): Promise<FFmpeg> => {
  const ffmpegInstance = new FFmpeg();
  try {
    await ffmpegInstance.load();
    return ffmpegInstance;
  } catch (error) {
    console.error("Error loading FFmpeg:", error);
    throw error; // Re-throw the error so the caller can handle it
  }
};

