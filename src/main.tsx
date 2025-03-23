import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { loadTimelineState } from './store/middleware/storage';
import { loadState } from './store/timelineSlice';
import { store } from './store';
import './index.css';

// Load saved timeline state if it exists
const savedState = loadTimelineState();
if (savedState) {
  store.dispatch(loadState(savedState));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
