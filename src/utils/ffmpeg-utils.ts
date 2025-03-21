import { debug, error as logError } from './debug';

// FFmpeg.wasm types
declare global {
  interface Window {
    FFmpeg: any;
  }
}

let ffmpeg: any = null;

/**
 * Loads the FFmpeg.wasm library
 */
export async function loadFFmpeg(): Promise<any> {
  debug('Loading FFmpeg.wasm...');

  try {
    // Enable SharedArrayBuffer by setting the required headers
    // Note: This works only if the server sets the appropriate headers
    // This is a polyfill for SharedArrayBuffer for browsers that don't support it
    // or when headers aren't properly set
    if (typeof SharedArrayBuffer === 'undefined') {
      debug('SharedArrayBuffer not available, using polyfill');
      (window as any).SharedArrayBuffer = ArrayBuffer;
    }

    // Load FFmpeg script
    if (!window.FFmpeg) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.10.1/dist/ffmpeg.min.js';

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load FFmpeg script'));
        document.head.appendChild(script);
      });

      debug('FFmpeg script loaded');
    }

    // Create FFmpeg instance
    return window.FFmpeg;
  } catch (err) {
    logError('Failed to load FFmpeg:', err);
    throw new Error(`Failed to load FFmpeg: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Creates and initializes an FFmpeg instance
 */
export async function createFFmpeg(options = { log: false }): Promise<any> {
  debug('Creating FFmpeg instance...');

  try {
    const { createFFmpeg } = window.FFmpeg;
    ffmpeg = createFFmpeg(options);
    await ffmpeg.load();

    debug('FFmpeg instance created and loaded');
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
    if (!ffmpeg) {
      await createFFmpeg({ log: true });
    }

    // Write the video file to the FFmpeg virtual filesystem
    ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));

    // Extract the audio track
    await ffmpeg.run('-i', 'input.mp4', '-vn', '-acodec', 'copy', 'output.aac');

    // Read the output file
    const data = ffmpeg.FS('readFile', 'output.aac');

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
    if (!ffmpeg) {
      await createFFmpeg({ log: true });
    }

    // Write the video file to the FFmpeg virtual filesystem
    ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));

    // Convert to a more edit-friendly format
    await ffmpeg.run(
      '-i', 'input.mp4',
      '-c:v', 'libx264',
      '-g', '1', // GOP size of 1 for frame-accurate seeking
      '-preset', 'ultrafast',
      '-crf', '23',
      'optimized.mp4'
    );

    // Read the output file
    const data = ffmpeg.FS('readFile', 'optimized.mp4');

    // Create a blob from the data
    const blob = new Blob([data.buffer], { type: 'video/mp4' });

    debug('Video optimization completed');
    return blob;
  } catch (err) {
    logError('Failed to optimize video:', err);
    throw new Error(`Failed to optimize video: ${err instanceof Error ? err.message : String(err)}`);
  }
}
