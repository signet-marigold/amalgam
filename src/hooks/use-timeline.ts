import { useState, useEffect } from 'react';
import { Timeline } from '../timeline/timeline';
import { StorageService } from '../services/storage-service';
import { Track, TrackType } from '../timeline/track';
import { Clip } from '../timeline/clip';

interface TimelineState {
  currentTime: number;
  clips: Clip[];
  tracks: {
    id: string;
    name: string;
    type: TrackType;
    index: number;
  }[];
}

export function useTimeline() {
  const [timeline, setTimeline] = useState<Timeline | null>(null);

  useEffect(() => {
    // Load timeline from storage on mount
    const loadTimeline = async () => {
      try {
        const savedState = await StorageService.loadTimelineState();
        const newTimeline = new Timeline();

        if (savedState) {
          // Set current time if it exists
          if (typeof savedState.currentTime === 'number') {
            newTimeline.currentTime = savedState.currentTime;
          }

          // Add tracks if they exist
          if (Array.isArray(savedState.tracks)) {
            savedState.tracks.forEach(trackData => {
              const track = new Track(trackData.type, trackData.index);
              track.id = trackData.id;
              track.name = trackData.name;
              newTimeline.addTrack(track);
            });
          }

          // Add clips if they exist
          if (Array.isArray(savedState.clips)) {
            savedState.clips.forEach(clip => {
              newTimeline.addClip(clip);
            });
          }
        }

        setTimeline(newTimeline);
      } catch (error) {
        console.error('Failed to load timeline:', error);
        // Create new timeline on error
        setTimeline(new Timeline());
      }
    };

    loadTimeline();
  }, []);

  // Save timeline when it changes
  useEffect(() => {
    if (timeline) {
      const stateToSave: TimelineState = {
        currentTime: timeline.currentTime,
        clips: timeline.clips,
        tracks: timeline.tracks.map(track => ({
          id: track.id,
          name: track.name,
          type: track.type,
          index: track.index
        }))
      };
      StorageService.saveTimelineState(stateToSave);
    }
  }, [timeline]);

  return { timeline, setTimeline };
} 