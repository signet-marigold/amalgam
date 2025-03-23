# Video Editor

A modern web-based video editor with timeline support, real-time preview, and export capabilities.

## Features

- Import multiple video formats (MP4, MKV, WebM)
- Timeline-based editing
- Real-time preview
- Effect support (brightness, contrast)
- Project state persistence
- Video export
- Background processing using Web Workers

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm start
```

3. Build for production:
```bash
npm run build
```

## Usage

1. Import Video Clips:
   - Click "Import Clips" to select video files
   - Supported formats: MP4, MKV, WebM

2. Timeline Editing:
   - Clips are automatically added to the timeline
   - Drag clips to reposition
   - Click × to remove clips

3. Preview:
   - Use play/pause button to control playback
   - Drag the timeline slider to seek
   - Current time and duration are displayed

4. Export:
   - Click "Export Video" to save the final video
   - Output format: WebM

5. Project Management:
   - Project state is automatically saved
   - Click "New Project" to start fresh

## Technical Details

- Built with React and TypeScript
- State management using Redux Toolkit
- Video processing in Web Workers
- Styled using styled-jsx
- Vite for development and building

## Browser Support

Requires a modern browser with support for:
- Web Workers
- OffscreenCanvas
- MediaRecorder API
- WebM video format
