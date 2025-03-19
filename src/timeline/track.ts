import { Clip } from './clip';
import { debug } from '../utils/debug';

export enum TrackType {
  Video = 'Video',
  Audio = 'Audio'
}

export interface TrackProps {
  id: string;
  name: string;
  type: TrackType;
  index: number;
}

export class Track {
  private _id: string;
  private _name: string;
  private _type: TrackType;
  private _index: number;
  private _clips: Clip[] = [];
  private _isMuted: boolean = false;
  private _isSolo: boolean = false;
  private _isLocked: boolean = false;
  
  constructor(props: TrackProps) {
    this._id = props.id;
    this._name = props.name;
    this._type = props.type;
    this._index = props.index;
    
    debug(`Created track: ${this._name} (${this._type})`);
  }
  
  get id(): string {
    return this._id;
  }
  
  get name(): string {
    return this._name;
  }
  
  set name(value: string) {
    this._name = value;
  }
  
  get type(): TrackType {
    return this._type;
  }
  
  get index(): number {
    return this._index;
  }
  
  set index(value: number) {
    this._index = value;
  }
  
  get clips(): Clip[] {
    return this._clips;
  }
  
  get isMuted(): boolean {
    return this._isMuted;
  }
  
  set isMuted(value: boolean) {
    this._isMuted = value;
  }
  
  get isSolo(): boolean {
    return this._isSolo;
  }
  
  set isSolo(value: boolean) {
    this._isSolo = value;
  }
  
  get isLocked(): boolean {
    return this._isLocked;
  }
  
  set isLocked(value: boolean) {
    this._isLocked = value;
  }
  
  // Add a clip to this track
  addClip(clip: Clip): void {
    this._clips.push(clip);
    this._clips.sort((a, b) => a.trackStartTime - b.trackStartTime);
    
    debug(`Added clip "${clip.name}" to track "${this._name}"`);
  }
  
  // Remove a clip from this track
  removeClip(clipId: string): boolean {
    const index = this._clips.findIndex(clip => clip.id === clipId);
    
    if (index !== -1) {
      this._clips.splice(index, 1);
      debug(`Removed clip with ID ${clipId} from track "${this._name}"`);
      return true;
    }
    
    return false;
  }
  
  // Check if a time range is occupied by any clip in this track
  isTimeRangeOccupied(startTime: number, endTime: number): boolean {
    return this._clips.some(clip => {
      const clipStart = clip.trackStartTime;
      const clipEnd = clipStart + clip.duration;
      
      // Check if the ranges overlap
      return (startTime < clipEnd && endTime > clipStart);
    });
  }
  
  // Get all clips that are active at a specific time
  getClipsAtTime(time: number): Clip[] {
    return this._clips.filter(clip => {
      const clipStart = clip.trackStartTime;
      const clipEnd = clipStart + clip.duration;
      
      return time >= clipStart && time < clipEnd;
    });
  }
  
  // Move a clip to a new position in this track
  moveClip(clipId: string, newStartTime: number): boolean {
    const clip = this._clips.find(c => c.id === clipId);
    
    if (!clip) {
      return false;
    }
    
    // Check if the new position conflicts with any other clip
    const newEndTime = newStartTime + clip.duration;
    const otherClips = this._clips.filter(c => c.id !== clipId);
    
    const hasConflict = otherClips.some(c => {
      const cStart = c.trackStartTime;
      const cEnd = cStart + c.duration;
      
      return (newStartTime < cEnd && newEndTime > cStart);
    });
    
    if (hasConflict) {
      return false;
    }
    
    // Move the clip
    clip.trackStartTime = newStartTime;
    
    // Re-sort clips by start time
    this._clips.sort((a, b) => a.trackStartTime - b.trackStartTime);
    
    return true;
  }
}
