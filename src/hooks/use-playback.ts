import { useState, useEffect, useCallback } from 'react';
import { useTimeline } from './use-timeline';

export function usePlayback() {
  const { timeline } = useTimeline();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Update current time when timeline changes
  useEffect(() => {
    if (timeline) {
      setCurrentTime(timeline.currentTime);
    }
  }, [timeline]);

  const play = useCallback(() => {
    if (timeline) {
      setIsPlaying(true);
      // Start playback from current time
      timeline.currentTime = currentTime;
    }
  }, [timeline, currentTime]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const seek = useCallback((time: number) => {
    if (timeline) {
      timeline.currentTime = time;
      setCurrentTime(time);
    }
  }, [timeline]);

  // Update timeline's current time when our current time changes
  useEffect(() => {
    if (timeline && timeline.currentTime !== currentTime) {
      timeline.currentTime = currentTime;
    }
  }, [currentTime, timeline]);

  return {
    isPlaying,
    currentTime,
    play,
    pause,
    seek
  };
} 