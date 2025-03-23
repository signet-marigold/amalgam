import { VideoProcessor } from '../services/videoProcessor';
import { Clip, VideoSettings } from '../types/video';

let processor: VideoProcessor | null = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'init':
      const { width, height } = payload;
      processor = new VideoProcessor(width, height);
      self.postMessage({ type: 'initialized' });
      break;

    case 'processFrame':
      if (!processor) {
        self.postMessage({ type: 'error', payload: 'Processor not initialized' });
        return;
      }

      const { clips, currentTime, settings } = payload;
      try {
        const frame = await processor.processFrame(clips, currentTime, settings);
        self.postMessage({ 
          type: 'frameProcessed', 
          payload: { frame, currentTime } 
        }, [frame?.data.buffer as ArrayBuffer]);
      } catch (error) {
        self.postMessage({ 
          type: 'error', 
          payload: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      break;

    case 'export':
      if (!processor) {
        self.postMessage({ type: 'error', payload: 'Processor not initialized' });
        return;
      }

      const { clips: exportClips, settings: exportSettings } = payload;
      try {
        const blob = await processor.exportVideo(
          exportClips, 
          exportSettings,
          (progress) => {
            self.postMessage({ type: 'exportProgress', payload: progress });
          }
        );
        self.postMessage({ type: 'exportComplete', payload: blob }, [blob]);
      } catch (error) {
        self.postMessage({ 
          type: 'error', 
          payload: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      break;
  }
};

// Type definitions for messages
export interface WorkerMessage {
  type: string;
  payload?: any;
}

export interface InitMessage extends WorkerMessage {
  type: 'init';
  payload: {
    width: number;
    height: number;
  };
}

export interface ProcessFrameMessage extends WorkerMessage {
  type: 'processFrame';
  payload: {
    clips: Clip[];
    currentTime: number;
    settings: VideoSettings;
  };
}

export interface ExportMessage extends WorkerMessage {
  type: 'export';
  payload: {
    clips: Clip[];
    settings: VideoSettings;
  };
}

export type VideoWorkerMessage = InitMessage | ProcessFrameMessage | ExportMessage; 