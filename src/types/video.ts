export interface VideoMetadata {
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  format: string;
}

export interface Clip {
  id: string;
  sourceUrl: string;
  duration: number;
  metadata: VideoMetadata;
}

export interface Effect {
  id: string;
  type: string;
  settings: Record<string, any>;
  startTime: number;
  duration: number;
}

export interface ClipManagerState {
  clips: {
    id: string;
    index: number;
    clip: Clip;
    effects: Effect[];
  }[];
}

export interface UnifiedBuffer {
  currentFrame: number;
  totalFrames: number;
  frameRate: number,
  resolution: {
    width: number,
    height: number,
  },
  buffer: ImageData[]; // For preview & export
  isGenerating: boolean;
}
