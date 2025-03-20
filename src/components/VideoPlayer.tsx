import React from "react";
import ReactPlayer from "react-player";

interface VideoPlayerProps {
  url: string;
  playing: boolean;
  volume: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, playing, volume }) => {
  return (
    <div className="w-[640px] h-[360px]">
      <ReactPlayer
        url={url}
        playing={playing}
        volume={volume}
        width="640px"
        height="360px"
        controls
        className="rounded-md overflow-hidden"
      />
    </div>
  );
};

export default VideoPlayer;

