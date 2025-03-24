import { debug, error as logError } from './debug';

// FFmpeg.wasm types
interface FFmpegInstance {
  FS: (command: string, ...args: any[]) => any;
  run: (...args: string[]) => Promise<void>;
  load: () => Promise<void>;
}

let ffmpeg: FFmpegInstance | null = null;

/**
 * Loads the FFmpeg.wasm script
 */
async function loadFFmpegScript(): Promise<void> {
  debug('Loading FFmpeg.wasm script...');

  try {
    // Create script element
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/ffmpeg.min.js';
    script.async = true;

    // Load script
    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load FFmpeg script'));
      document.head.appendChild(script);
    });

    debug('FFmpeg script loaded successfully');
  } catch (err) {
    logError('Failed to load FFmpeg script:', err);
    throw new Error(`Failed to load FFmpeg script: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Creates and initializes an FFmpeg instance
 */
export async function initFFmpeg(): Promise<FFmpegInstance> {
  debug('Creating FFmpeg instance...');

  try {
    if (!ffmpeg) {
      // Load FFmpeg script if not already loaded
      if (!(window as any).FFmpeg) {
        await loadFFmpegScript();
      }

      // Create FFmpeg instance
      const { createFFmpeg } = (window as any).FFmpeg;
      const instance = createFFmpeg({ 
        log: true,
        corePath: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/ffmpeg-core.js'
      });

      // Load FFmpeg
      await instance.load();
      ffmpeg = instance;
      debug('FFmpeg instance created and loaded');
    }
    if (!ffmpeg) {
      throw new Error('Failed to create FFmpeg instance');
    }
    return ffmpeg;
  } catch (err) {
    logError('Failed to create FFmpeg instance:', err);
    throw new Error(`Failed to create FFmpeg instance: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Utility function to fetch file data for FFmpeg
 */
export async function fetchFile(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (!reader.result) {
        return reject(new Error('Failed to read file'));
      }

      const result = new Uint8Array(reader.result as ArrayBuffer);
      resolve(result);
    };

    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extracts the audio track from a video file
 */
export async function extractAudio(videoFile: File): Promise<Blob> {
  debug(`Extracting audio from ${videoFile.name}...`);

  try {
    const instance = await initFFmpeg();
    if (!instance) {
      throw new Error('Failed to initialize FFmpeg');
    }

    // Write the video file to the FFmpeg virtual filesystem
    instance.FS('writeFile', 'input.mp4', await fetchFile(videoFile));

    // Extract the audio track
    await instance.run('-i', 'input.mp4', '-vn', '-acodec', 'copy', 'output.aac');

    // Read the output file
    const data = instance.FS('readFile', 'output.aac');

    // Create a blob from the data
    const blob = new Blob([data.buffer], { type: 'audio/aac' });

    debug('Audio extraction completed');
    return blob;
  } catch (err) {
    logError('Failed to extract audio:', err);
    throw new Error(`Failed to extract audio: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Converts a video to an optimized format for editing
 */
export async function optimizeVideo(videoFile: File): Promise<Blob> {
  debug(`Optimizing video ${videoFile.name}...`);

  try {
    const instance = await initFFmpeg();
    if (!instance) {
      throw new Error('Failed to initialize FFmpeg');
    }

    // Write the video file to the FFmpeg virtual filesystem
    instance.FS('writeFile', 'input.mp4', await fetchFile(videoFile));

    // Convert to a more edit-friendly format
    await instance.run(
      '-i', 'input.mp4',
      '-c:v', 'libx264',
      '-g', '1', // GOP size of 1 for frame-accurate seeking
      '-preset', 'ultrafast',
      '-crf', '23',
      'optimized.mp4'
    );

    // Read the output file
    const data = instance.FS('readFile', 'optimized.mp4');

    // Create a blob from the data
    const blob = new Blob([data.buffer], { type: 'video/mp4' });

    debug('Video optimization completed');
    return blob;
  } catch (err) {
    logError('Failed to optimize video:', err);
    throw new Error(`Failed to optimize video: ${err instanceof Error ? err.message : String(err)}`);
  }
}
