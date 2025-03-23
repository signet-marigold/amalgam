import React, { useEffect, useRef } from "react";
import VolumeControl from "./VolumeControl";

interface PreviewPlateProps {
  handlePlayPause: () => void; // Function to handle play/pause
  handleVolumeChange: (volume: number) => void; // Function to handle volume change
  videoUrl: string | null; // URL of the video
  playing: boolean; // Whether the video is currently playing
  volume: number; // Current volume level (e.g., 0 to 1)
}

const PreviewPlate: React.FC<PreviewPlateProps> = ({
  handlePlayPause,
  handleVolumeChange,
  videoUrl,
  playing,
  volume,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      const ctx = canvas.getContext("2d");

      const drawFrame = () => {
        if (ctx && video) {
          // Draw the current video frame onto the canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        requestAnimationFrame(drawFrame); // Continuously update the canvas
      };

      drawFrame();
    }
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      if (playing) {
        video.play();
      } else {
        video.pause();
      }
    }
  }, [playing, volume]);

  return (
    <section className="p-4">
      <div className="flex flex-col items-center space-y-4">
        {/* Canvas for rendering the video */}
        <canvas
          ref={canvasRef}
          id="preview-canvas"
          className="shadow border border-bordercolor rounded"
          width={640}
          height={360}
        ></canvas>

        {/* Hidden video element for playback */}
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            style={{ display: "none" }}
            crossOrigin="anonymous"
          />
        )}

        {/* Controls for play/pause and volume */}
        {videoUrl && (
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={handlePlayPause}
              className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              {playing ? "Pause" : "Play"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default PreviewPlate;
