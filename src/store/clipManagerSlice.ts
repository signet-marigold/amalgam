import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ClipManagerState } from '../types/video';
import { v4 as uuidv4 } from 'uuid';

const initialState: ClipManagerState = {
  clips: [],
};

const clipManagerSlice = createSlice({
  name: 'clipManager',
  initialState,
  reducers: {
    importClip: (state, action: PayloadAction<{
      sourceUrl: string;
      duration: number;
      metadata: {
        width: number;
        height: number;
        frameRate: number;
        format: string;
      };
    }>) => {
      state.clips.push({
        id: uuidv4(),
        ...action.payload,
      });
    },

    removeClip: (state, action: PayloadAction<string>) => {
      state.clips = state.clips.filter(clip => clip.id !== action.payload);
    },

    clearClips: (state) => {
      state.clips = [];
    },
  },
});

export const { importClip, removeClip, clearClips } = clipManagerSlice.actions;

export default clipManagerSlice.reducer;
