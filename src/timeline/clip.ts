import { TrackType } from './track';

export interface ClipBase {
  id: string;
  name: string;
  source: string;
  sourceFile: File;
  startTime: number;
  endTime: number;
  duration: number;
  trackStartTime: number;
  trackId: string;
  type: TrackType;
}

export interface VideoClipProps extends ClipBase {
  width: number;
  height: number;
  hasAudio: boolean;
}

export interface AudioClipProps extends ClipBase {
  linkedClipId?: string;
}

export class VideoClip implements ClipBase {
  id: string;
  name: string;
  source: string;
  sourceFile: File;
  startTime: number;
  endTime: number;
  duration: number;
  trackStartTime: number;
  trackId: string;
  type: TrackType = TrackType.Video;
  width: number;
  height: number;
  hasAudio: boolean;

  constructor(data: VideoClipProps) {
    this.id = data.id;
    this.name = data.name;
    this.source = data.source;
    this.sourceFile = data.sourceFile;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.duration = data.endTime - data.startTime;
    this.trackStartTime = data.trackStartTime;
    this.trackId = data.trackId;
    this.width = data.width;
    this.height = data.height;
    this.hasAudio = data.hasAudio;
  }

  get aspectRatio(): number {
    return this.width / this.height;
  }
}

export class AudioClip implements ClipBase {
  id: string;
  name: string;
  source: string;
  sourceFile: File;
  startTime: number;
  endTime: number;
  duration: number;
  trackStartTime: number;
  trackId: string;
  type: TrackType = TrackType.Audio;
  linkedClipId?: string;

  constructor(data: AudioClipProps) {
    this.id = data.id;
    this.name = data.name;
    this.source = data.source;
    this.sourceFile = data.sourceFile;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.duration = data.endTime - data.startTime;
    this.trackStartTime = data.trackStartTime;
    this.trackId = data.trackId;
    this.linkedClipId = data.linkedClipId;
  }

  get isLinked(): boolean {
    return !!this.linkedClipId;
  }
}

export type Clip = VideoClip | AudioClip;
