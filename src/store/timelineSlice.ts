import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TimelineState, Clip, Effect, VideoSettings } from '../types/video';
import { v4 as uuidv4 } from 'uuid';

const initialState: TimelineState = {
  id: uuidv4(),
  clips: [],
  duration: 0,
  settings: {
    resolution: {
      width: 1920,
      height: 1080,
    },
    frameRate: 30,
  },
  lastModified: Date.now(),
};

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    addClip: (state, action: PayloadAction<Omit<Clip, 'startTime'>>) => {
      const lastClip = state.clips[state.clips.length - 1];
      const startTime = lastClip ? lastClip.startTime + lastClip.duration : 0;
      
      state.clips.push({
        ...action.payload,
        startTime,
      });
      
      state.duration = Math.max(state.duration, startTime + action.payload.duration);
      state.lastModified = Date.now();
    },
    
    removeClip: (state, action: PayloadAction<string>) => {
      state.clips = state.clips.filter(clip => clip.id !== action.payload);
      state.lastModified = Date.now();
      
      // Recalculate duration
      state.duration = state.clips.reduce((max, clip) => 
        Math.max(max, clip.startTime + clip.duration), 0);
    },
    
    updateClipTiming: (state, action: PayloadAction<{ 
      clipId: string; 
      startTime?: number; 
      duration?: number; 
      offset?: number; 
    }>) => {
      const clip = state.clips.find(c => c.id === action.payload.clipId);
      if (clip) {
        if (action.payload.startTime !== undefined) clip.startTime = action.payload.startTime;
        if (action.payload.duration !== undefined) clip.duration = action.payload.duration;
        if (action.payload.offset !== undefined) clip.offset = action.payload.offset;
        state.lastModified = Date.now();
        
        // Recalculate duration
        state.duration = state.clips.reduce((max, clip) => 
          Math.max(max, clip.startTime + clip.duration), 0);
      }
    },
    
    addEffect: (state, action: PayloadAction<{ 
      clipId: string; 
      effect: Effect; 
    }>) => {
      const clip = state.clips.find(c => c.id === action.payload.clipId);
      if (clip) {
        clip.effects.push(action.payload.effect);
        state.lastModified = Date.now();
      }
    },
    
    removeEffect: (state, action: PayloadAction<{ 
      clipId: string; 
      effectId: string; 
    }>) => {
      const clip = state.clips.find(c => c.id === action.payload.clipId);
      if (clip) {
        clip.effects = clip.effects.filter(e => e.id !== action.payload.effectId);
        state.lastModified = Date.now();
      }
    },
    
    updateSettings: (state, action: PayloadAction<VideoSettings>) => {
      state.settings = action.payload;
      state.lastModified = Date.now();
    },
    
    loadState: (state, action: PayloadAction<TimelineState>) => {
      return { ...action.payload, lastModified: Date.now() };
    },
    
    clearState: (state) => {
      return { ...initialState, id: uuidv4(), lastModified: Date.now() };
    },
  },
});

export const { 
  addClip, 
  removeClip, 
  updateClipTiming, 
  addEffect, 
  removeEffect, 
  updateSettings,
  loadState,
  clearState,
} = timelineSlice.actions;

export default timelineSlice.reducer; 