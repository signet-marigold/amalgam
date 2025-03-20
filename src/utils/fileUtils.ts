// src/utils/fileUtils.ts
import { fetchFile } from "@ffmpeg/util";

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
  addClip: (clip: File) => void
) {
  if (file) {
    // Create an object URL for the file so it can be displayed.
    setVideoUrl(URL.createObjectURL(file));
    // Process the file data using ffmpeg's fetchFile.
    const fileData = await fetchFile(file);
    // Create a new file object with the processed data.
    const newFile = new File([fileData], file.name, { type: file.type });
    // Add the clip using the provided callback.
    addClip(newFile);
  }
}

