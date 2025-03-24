import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UnifiedBuffer } from '../types/video';

const initialState: UnifiedBuffer = {
  currentFrame: 0,
  totalFrames: 0,
  frameRate: 30,
  resolution: {
    width: 1920,
    height: 1080,
  },
  buffer: [],
  isGenerating: false,
};

const bufferSlice = createSlice({
  name: 'buffer',
  initialState,
  reducers: {
    setCurrentFrame: (state, action: PayloadAction<number>) => {
      state.currentFrame = Math.min(Math.max(0, action.payload), state.totalFrames - 1);
    },

    updateBuffer: (state, action: PayloadAction<{
      buffer: ImageData[];
      totalFrames: number;
      frameRate: number;
      resolution: { width: number; height: number; };
    }>) => {
      state.buffer = action.payload.buffer;
      state.totalFrames = action.payload.totalFrames;
      state.frameRate = action.payload.frameRate;
      state.resolution = action.payload.resolution;
      state.currentFrame = Math.min(state.currentFrame, state.totalFrames - 1);
    },

    setGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },

    clearBuffer: (state) => {
      state.buffer = [];
      state.currentFrame = 0;
      state.totalFrames = 0;
      state.isGenerating = false;
    },
  },
});

export const {
  setCurrentFrame,
  updateBuffer,
  setGenerating,
  clearBuffer
} = bufferSlice.actions;

export default bufferSlice.reducer;
