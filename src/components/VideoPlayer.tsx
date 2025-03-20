import React from "react";
import ReactPlayer from "react-player";

interface VideoPlayerProps {
  url: string;
  playing: boolean;
  volume: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, playing, volume }) => {
  return (
    <ReactPlayer
      url={url}
      playing={playing}
      volume={volume}
      controls={false}
      className="rounded-md overflow-hidden"
    />
  );
};

export default VideoPlayer;
