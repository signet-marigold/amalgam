export interface VideoSettings {
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
}

export interface Effect {
  id: string;
  type: string;
  settings: Record<string, any>;
  startTime: number;
  duration: number;
}

export interface Clip {
  id: string;
  sourceUrl: string;
  startTime: number; // Position in timeline
  duration: number;
  offset: number; // Offset from clip start
  effects: Effect[];
}

export interface TimelineState {
  id: string;
  clips: Clip[];
  duration: number;
  settings: VideoSettings;
  lastModified: number;
}

export interface ClipManagerState {
  clips: {
    id: string;
    sourceUrl: string;
    duration: number;
    metadata: {
      width: number;
      height: number;
      frameRate: number;
      format: string;
    };
  }[];
}

export interface UnifiedBuffer {
  currentFrame: number;
  totalFrames: number;
  frameRate: number;
  resolution: {
    width: number;
    height: number;
  };
  buffer: ImageData[]; // For preview
  isGenerating: boolean;
} 