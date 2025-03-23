import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';

const STORAGE_KEY = 'video_editor_timeline_state';

export const storageMiddleware: Middleware<{}, RootState> = store => next => action => {
  const result = next(action);
  
  // Save timeline state to localStorage after any timeline action
  if (action.type.startsWith('timeline/')) {
    const timelineState = store.getState().timeline;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timelineState));
    } catch (error) {
      console.error('Failed to save timeline state to storage:', error);
    }
  }
  
  return result;
};

export const loadTimelineState = () => {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      return JSON.parse(savedState);
    }
  } catch (error) {
    console.error('Failed to load timeline state from storage:', error);
  }
  return null;
};

export const clearSavedState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear timeline state from storage:', error);
  }
}; 