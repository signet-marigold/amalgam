import { Clip, VideoClip, AudioClip } from '../timeline/clip';
import { debug, error as logError } from '../utils/debug';
import { createFFmpeg, fetchFile } from '../utils/ffmpeg-utils';

interface ExportConfig {
  clips: Clip[];
  width: number;
  height: number;
  frameRate: number;
  format: string;
  quality: number;
  onProgress?: (progress: number) => void;
}

export class FinalRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private isExporting: boolean = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');

    if (!this.ctx) {
      logError('Failed to get canvas context for final renderer');
    }
  }

  async exportVideo(config: ExportConfig): Promise<string> {
    if (this.isExporting) {
      throw new Error('Export already in progress');
    }

    if (!this.ctx) {
      throw new Error('Canvas context not available');
    }

    try {
      this.isExporting = true;

      debug('Starting video export with config:', config);

      // Set canvas dimensions
      this.canvas.width = config.width;
      this.canvas.height = config.height;

      // Sort clips by start time
      const sortedClips = [...config.clips].sort((a, b) => a.trackStartTime - b.trackStartTime);

      // Separate video and audio clips
      const videoClips = sortedClips.filter(clip => clip instanceof VideoClip) as VideoClip[];
      const audioClips = sortedClips.filter(clip => clip instanceof AudioClip) as AudioClip[];

      // Get the total duration of the video
      const endTime = Math.max(...sortedClips.map(clip => clip.trackStartTime + clip.duration));

      // Initialize FFmpeg
      const ffmpeg = await createFFmpeg({ log: true });
      await ffmpeg.load();

      // Step 1: Convert each video to a compatible format with increased GOP size
      debug('Step 1: Converting videos to optimized format');
      const optimizedVideos: Record<string, string> = {};

      let currentProgress = 0;
      const progressStep = 0.3 / videoClips.length; // Allocate 30% to video conversion

      for (let i = 0; i < videoClips.length; i++) {
        const clip = videoClips[i];
        debug(`Converting video ${i+1}/${videoClips.length}: ${clip.name}`);

        // Write the source video to the virtual filesystem
        const inputName = `input_${i}.mp4`;
        ffmpeg.FS('writeFile', inputName, await fetchFile(clip.sourceFile));

        // Convert to MP4 with increased GOP size for better seeking
        const outputName = `optimized_${i}.mp4`;
        await ffmpeg.run(
          '-i', inputName,
          '-c:v', 'libx264',
          '-g', '1', // Set GOP size to 1 for frame-accurate seeking
          '-preset', 'ultrafast',
          '-crf', '23',
          outputName
        );

        // Store the optimized video name
        optimizedVideos[clip.id] = outputName;

        // Update progress
        currentProgress += progressStep;
        if (config.onProgress) {
          config.onProgress(currentProgress);
        }
      }

      // Step 2: Extract and merge all audio
      debug('Step 2: Processing audio');
      if (audioClips.length > 0) {
        for (let i = 0; i < audioClips.length; i++) {
          const clip = audioClips[i];
          debug(`Processing audio ${i+1}/${audioClips.length}: ${clip.name}`);

          // Write the source audio to the virtual filesystem
          const inputName = `audio_${i}.mp3`;
          ffmpeg.FS('writeFile', inputName, await fetchFile(clip.sourceFile));
        }

        // We'll handle audio in the final step
      }

      // Step 3: Render frames
      debug('Step 3: Rendering frames');

      // Calculate total frames to render
      const frameDuration = 1 / config.frameRate;
      const totalFrames = Math.ceil(endTime * config.frameRate);

      // Allocate 50% of progress to frame rendering
      const frameProgressStep = 0.5 / totalFrames;
      currentProgress = 0.3; // Start after video conversion

      // Set up ffmpeg command for creating an output video from frames
      // First, we'll create a temporary directory to store frames
      ffmpeg.FS('mkdir', 'frames');

      // Render each frame
      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        const timePosition = frameIndex * frameDuration;

        // Clear the canvas
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Find active video clips at this time
        const activeClips = videoClips.filter(clip => {
          const clipStart = clip.trackStartTime;
          const clipEnd = clipStart + clip.duration;
          return timePosition >= clipStart && timePosition < clipEnd;
        });

        // Render each active clip to the canvas
        for (const clip of activeClips) {
          // Calculate the relative position in the source video
          const relativeTime = clip.getRelativeTime(timePosition);

          if (relativeTime >= 0) {
            // Create a video element to get the frame
            const video = document.createElement('video');
            const optimizedVideoName = optimizedVideos[clip.id];

            // Read the file from FFmpeg's virtual filesystem
            const videoData = ffmpeg.FS('readFile', optimizedVideoName);
            const videoBlob = new Blob([videoData.buffer], { type: 'video/mp4' });
            const videoUrl = URL.createObjectURL(videoBlob);

            video.src = videoUrl;

            // Wait for the video to load and seek to the correct position
            await new Promise<void>((resolve, reject) => {
              video.onloadeddata = () => {
                video.currentTime = relativeTime;
              };

              video.onseeked = () => {
                // Draw the frame to the canvas
                this.ctx!.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);

                // Clean up
                URL.revokeObjectURL(videoUrl);
                video.remove();

                resolve();
              };

              video.onerror = () => {
                logError(`Error seeking video to ${relativeTime}`);
                URL.revokeObjectURL(videoUrl);
                video.remove();
                reject(new Error(`Error seeking video to ${relativeTime}`));
              };
            });
          }
        }

        // Save the canvas as an image
        const frameDataUrl = this.canvas.toDataURL('image/jpeg', config.quality / 100);
        const frameData = Uint8Array.from(atob(frameDataUrl.split(',')[1]), c => c.charCodeAt(0));

        // Write the frame to the virtual filesystem
        const frameName = `frames/frame_${frameIndex.toString().padStart(6, '0')}.jpg`;
        ffmpeg.FS('writeFile', frameName, frameData);

        // Update progress
        currentProgress += frameProgressStep;
        if (config.onProgress) {
          config.onProgress(currentProgress);
        }
      }

      // Step 4: Create a video from the frames
      debug('Step 4: Creating video from frames');

      await ffmpeg.run(
        '-framerate', config.frameRate.toString(),
        '-i', 'frames/frame_%06d.jpg',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        'output.mp4'
      );

      // Step 5: Final muxing with audio
      debug('Step 5: Final muxing with audio');

      // Create the final video with FFmpeg
      if (audioClips.length > 0) {
        // Create a file with audio track information
        let audioFileContent = '';

        for (let i = 0; i < audioClips.length; i++) {
          const clip = audioClips[i];
          audioFileContent += `file 'audio_${i}.mp3'\n`;
          audioFileContent += `inpoint ${clip.startTime}\n`;
          audioFileContent += `outpoint ${clip.endTime}\n`;
        }

        ffmpeg.FS('writeFile', 'audio_list.txt', audioFileContent);

        // Combine video with audio
        await ffmpeg.run(
          '-i', 'output.mp4',
          '-f', 'concat',
          '-safe', '0',
          '-i', 'audio_list.txt',
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-map', '0:v',
          '-map', '1:a',
          '-shortest',
          'final_output.mp4'
        );
      } else {
        // Just use the output video if no audio
        await ffmpeg.run(
          '-i', 'output.mp4',
          '-c:v', 'copy',
          'final_output.mp4'
        );
      }

      // Read the final output file
      const outputData = ffmpeg.FS('readFile', 'final_output.mp4');

      // Create a download link
      const blob = new Blob([outputData.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      // Create a download link and click it
      const a = document.createElement('a');
      a.href = url;
      a.download = `exported_video_${new Date().getTime()}.mp4`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      // Complete progress
      if (config.onProgress) {
        config.onProgress(1.0);
      }

      debug('Video export completed successfully');

      this.isExporting = false;
      return url;

    } catch (err) {
      this.isExporting = false;
      logError('Error during video export:', err);
      throw new Error(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
