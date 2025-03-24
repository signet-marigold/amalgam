import { useState, useCallback } from 'react';
import { initFFmpeg, extractAudio, optimizeVideo } from '../utils/ffmpeg-utils';
import { debug, error as logError } from '../utils/debug';

interface UseFFmpegReturn {
  isInitialized: boolean;
  isProcessing: boolean;
  error: string | null;
  initializeFFmpeg: () => Promise<void>;
  processVideo: (file: File) => Promise<Blob>;
  extractAudioTrack: (file: File) => Promise<Blob>;
}

export default function useFFmpeg(): UseFFmpegReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeFFmpeg = useCallback(async () => {
    try {
      setError(null);
      await initFFmpeg();
      setIsInitialized(true);
      debug('FFmpeg initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize FFmpeg';
      logError('FFmpeg initialization failed:', errorMessage);
      setError(errorMessage);
    }
  }, []);

  const processVideo = useCallback(async (file: File): Promise<Blob> => {
    try {
      setIsProcessing(true);
      setError(null);
      const result = await optimizeVideo(file);
      setIsProcessing(false);
      return result;
    } catch (err) {
      setIsProcessing(false);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process video';
      logError('Video processing failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const extractAudioTrack = useCallback(async (file: File): Promise<Blob> => {
    try {
      setIsProcessing(true);
      setError(null);
      const result = await extractAudio(file);
      setIsProcessing(false);
      return result;
    } catch (err) {
      setIsProcessing(false);
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract audio';
      logError('Audio extraction failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    isInitialized,
    isProcessing,
    error,
    initializeFFmpeg,
    processVideo,
    extractAudioTrack
  };
}
