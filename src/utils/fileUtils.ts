// src/utils/fileUtils.ts

/**
 * Processes the file by creating an object URL and
 * preparing a new File via ffmpeg's fetchFile.
 *
 * @param file The file to process.
 * @param setVideoUrl Callback to set the video URL.
 * @param addClip Callback to add the processed file as a clip.
 */
export async function handleFileChange(
  file: File,
  setVideoUrl: (url: string) => void,
  addClip: (clip: any) => void
) {
  if (file) {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    addClip({
      id: Date.now(),
      url,
      duration: 0,
      startTime: 0,
      file: await file.arrayBuffer().then(buffer => new Uint8Array(buffer))
    });
  }
}

