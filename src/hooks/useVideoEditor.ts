// src/hooks/useVideoEditor.ts
import { useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";

export interface Clip {
  id: string;
  source: string;
}

interface VideoEditorState {
  clips: Clip[];
}

interface VideoEditorActions {
  addClip: (file: File) => void;
}

const useVideoEditor = (_ffmpeg: FFmpeg | null): [VideoEditorState, VideoEditorActions] => {
  const [clips, setClips] = useState<Clip[]>([]);

  const addClip = (file: File): void => {
    const clip: Clip = {
      id: String(Date.now()),
      source: URL.createObjectURL(file)
    };
    setClips((prev) => [...prev, clip]);
  };

  return [{ clips }, { addClip }];
};

export default useVideoEditor;
