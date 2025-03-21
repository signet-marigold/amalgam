// src/utils/fileUtils.ts
import { VideoClip } from '../timeline/clip';
import { debug } from './debug';

// Keep track of all blob URLs to prevent garbage collection
const blobUrls = new Set<string>();

// Supported video formats
const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime'
];

/**
 * Processes the file by creating an object URL and
 * preparing a new File via ffmpeg's fetchFile.
 *
 * @param file The file to process.
 * @param setVideoUrl Callback to set the video URL.
 * @param addClip Callback to add the processed file as a clip.
 */
export async function handleFileChange(file: File): Promise<VideoClip> {
  debug('Processing file:', file.name);

  // Validate file type
  if (!file.type.startsWith('video/')) {
    throw new Error(`Invalid file type: ${file.type}. Only video files are supported.`);
  }

  // Check if the format is supported
  if (!SUPPORTED_VIDEO_FORMATS.includes(file.type)) {
    throw new Error(`Unsupported video format: ${file.type}. Supported formats are: ${SUPPORTED_VIDEO_FORMATS.join(', ')}`);
  }

  // Create a blob URL for the file
  const blobUrl = URL.createObjectURL(file);
  blobUrls.add(blobUrl); // Add to our tracking set

  // Create a video element to get metadata
  const video = document.createElement('video');
  video.preload = 'metadata'; // Ensure metadata is preloaded
  video.src = blobUrl;
  video.muted = true;

  try {
    // Wait for metadata to load with a timeout
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        const handleMetadata = () => {
          debug('Video metadata loaded successfully');
          video.removeEventListener('loadedmetadata', handleMetadata);
          video.removeEventListener('error', handleError);
          resolve();
        };

        const handleError = () => {
          const error = video.error;
          debug('Video error:', {
            code: error?.code,
            message: error?.message
          });
          
          let errorMessage = 'Unknown video error';
          if (error) {
            switch (error.code) {
              case 1:
                errorMessage = 'Video loading aborted';
                break;
              case 2:
                errorMessage = 'Network error while loading video';
                break;
              case 3:
                errorMessage = 'Video decoding failed - format may not be supported';
                break;
              case 4:
                errorMessage = 'Video source not found';
                break;
              default:
                errorMessage = error.message || 'Unknown video error';
            }
          }
          
          video.removeEventListener('loadedmetadata', handleMetadata);
          video.removeEventListener('error', handleError);
          reject(new Error(`Video error: ${errorMessage}`));
        };

        video.addEventListener('loadedmetadata', handleMetadata);
        video.addEventListener('error', handleError);
      }),
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout loading video metadata - file may be too large or corrupted')), 10000);
      })
    ]);

    // Validate video properties
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('Invalid video dimensions');
    }

    // Create a new video clip
    const clip = new VideoClip({
      id: crypto.randomUUID(),
      name: file.name,
      source: blobUrl,
      sourceFile: file,
      startTime: 0,
      endTime: video.duration,
      trackStartTime: 0,
      width: video.videoWidth,
      height: video.videoHeight,
      hasAudio: true // We'll handle audio separately
    });

    debug('Created video clip:', clip.name);
    return clip;
  } catch (error) {
    // Clean up the blob URL if there was an error
    revokeBlobUrl(blobUrl);
    debug('Error processing file:', error);
    throw error;
  } finally {
    // Clean up the video element
    video.src = '';
    video.load();
  }
}

/**
 * Revokes all blob URLs that have been created.
 * This should be called when the application is shutting down
 * or when clips are being removed.
 */
export function revokeAllBlobUrls(): void {
  blobUrls.forEach(url => {
    URL.revokeObjectURL(url);
  });
  blobUrls.clear();
}

/**
 * Revokes a specific blob URL.
 * This should be called when a clip is removed.
 */
export function revokeBlobUrl(url: string): void {
  if (blobUrls.has(url)) {
    URL.revokeObjectURL(url);
    blobUrls.delete(url);
  }
}

// Function to check if a blob URL is still valid
export function isValidBlobUrl(url: string): boolean {
  return blobUrls.has(url);
}

// Function to get all active blob URLs
export function getActiveBlobUrls(): string[] {
  return Array.from(blobUrls);
}

