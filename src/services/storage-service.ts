import { Timeline } from '../timeline/timeline';
import { Clip } from '../timeline/clip';
import { Track, TrackType } from '../timeline/track';

interface TimelineState {
  clips: Clip[];
  currentTime: number;
  tracks: Array<{
    id: string;
    name: string;
    type: TrackType;
    index: number;
  }>;
}

export class StorageService {
  private static readonly STORAGE_KEY = 'timeline_state';

  public static saveTimelineState(state: TimelineState): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save timeline state:', error);
    }
  }

  public static loadTimelineState(): TimelineState | null {
    try {
      const savedState = localStorage.getItem(this.STORAGE_KEY);
      if (savedState) {
        return JSON.parse(savedState);
      }
    } catch (error) {
      console.error('Failed to load timeline state:', error);
    }
    return null;
  }

  public static clearTimelineState(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear timeline state:', error);
    }
  }
} 