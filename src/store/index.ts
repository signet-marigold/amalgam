import { configureStore } from '@reduxjs/toolkit';
import timelineReducer from './timelineSlice';
import clipManagerReducer from './clipManagerSlice';
import bufferReducer from './bufferSlice';
import { setupListeners } from '@reduxjs/toolkit/query';

export const store = configureStore({
  reducer: {
    timeline: timelineReducer,
    clipManager: clipManagerReducer,
    buffer: bufferReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disabled for ImageData handling
    }),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 