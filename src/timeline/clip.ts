export interface ClipProps {
  id: string;
  name: string;
  source: string;
  sourceFile: File;
  startTime: number;
  endTime: number;
  trackStartTime: number;
}

export interface VideoClipProps extends ClipProps {
  width: number;
  height: number;
  hasAudio: boolean;
}

export interface AudioClipProps extends ClipProps {
  linkedClipId?: string;
}

export abstract class Clip {
  private _id: string;
  private _name: string;
  private _source: string;
  private _sourceFile: File;
  private _startTime: number; // Start time in the original media
  private _endTime: number;   // End time in the original media
  private _trackStartTime: number; // Position on the timeline

  constructor(props: ClipProps) {
    this._id = props.id;
    this._name = props.name;
    this._source = props.source;
    this._sourceFile = props.sourceFile;
    this._startTime = props.startTime;
    this._endTime = props.endTime;
    this._trackStartTime = props.trackStartTime;
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

  get source(): string {
    return this._source;
  }

  get sourceFile(): File {
    return this._sourceFile;
  }

  get startTime(): number {
    return this._startTime;
  }

  set startTime(value: number) {
    this._startTime = value;
  }

  get endTime(): number {
    return this._endTime;
  }

  set endTime(value: number) {
    this._endTime = value;
  }

  get trackStartTime(): number {
    return this._trackStartTime;
  }

  set trackStartTime(value: number) {
    this._trackStartTime = value;
  }

  get duration(): number {
    return this._endTime - this._startTime;
  }

  set duration(value: number) {
    this._endTime = this._startTime + value;
  }

  // Helper method to get the relative time within the clip
  getRelativeTime(timelineTime: number): number {
    // If the timeline time is outside the clip's bounds, return -1
    if (timelineTime < this._trackStartTime || timelineTime > this._trackStartTime + this.duration) {
      return -1;
    }

    // Calculate the time within the clip
    return this._startTime + (timelineTime - this._trackStartTime);
  }
}

export class VideoClip extends Clip {
  private _width: number;
  private _height: number;
  private _hasAudio: boolean;

  constructor(props: VideoClipProps) {
    super(props);
    this._width = props.width;
    this._height = props.height;
    this._hasAudio = props.hasAudio;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get aspectRatio(): number {
    return this._width / this._height;
  }

  get hasAudio(): boolean {
    return this._hasAudio;
  }

  set hasAudio(value: boolean) {
    this._hasAudio = value;
  }
}

export class AudioClip extends Clip {
  private _linkedClipId?: string;

  constructor(props: AudioClipProps) {
    super(props);
    this._linkedClipId = props.linkedClipId;
  }

  get linkedClipId(): string | undefined {
    return this._linkedClipId;
  }

  set linkedClipId(value: string | undefined) {
    this._linkedClipId = value;
  }

  // Check if this audio clip is linked to a video clip
  get isLinked(): boolean {
    return !!this._linkedClipId;
  }
}
