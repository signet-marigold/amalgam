import React, { useState } from 'react';
import { VideoClip } from '../timeline/clip';

interface ClipPoolProps {
  clips: VideoClip[];
  onClipSelect: (clip: VideoClip) => void;
  onClipDelete: (clip: VideoClip) => void;
}

const ClipPool: React.FC<ClipPoolProps> = ({ clips = [], onClipSelect, onClipDelete }) => {
  const [selectedClip, setSelectedClip] = useState<VideoClip | null>(null);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleClipClick = (clip: VideoClip) => {
    setSelectedClip(clip);
  };

  const handleAddToTimeline = () => {
    if (selectedClip) {
      onClipSelect(selectedClip);
      setSelectedClip(null);
    }
  };

  const handleDeleteClip = () => {
    if (selectedClip) {
      onClipDelete(selectedClip);
      setSelectedClip(null);
    }
  };

  return (
    <section className="clip-pool-container border-t-1 border-bordercolor px-2 py-1">
      <h3>Media Library</h3>
      <div className="min-h-10">
        {clips.length === 0 ? (
          <div className="text-gray-400 text-center py-4">
            No media files imported yet. Click "Import Media" to add files.
          </div>
        ) : (
          clips.map(clip => (
            <div
              key={clip.id}
              className={`clip-pool-item video-clip cursor-pointer p-2 mb-2 rounded ${
                selectedClip?.id === clip.id ? 'bg-primary/20' : 'hover:bg-primary/10'
              }`}
              onClick={() => handleClipClick(clip)}
            >
              <div className="clip-name font-medium">{clip.name}</div>
              <div className="clip-duration text-sm text-gray-400">{formatTime(clip.duration)}</div>
            </div>
          ))
        )}
      </div>
      <div className="py-2">
        <button
          className="p-0 px-2 h-7 mr-1 bg-primary hover:bg-primary-hover rounded disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleAddToTimeline}
          disabled={!selectedClip}
        >
          Add to Timeline
        </button>
        <button
          className="p-0 px-2 h-7 mx-1 text-white bg-warning hover:bg-warning-hover rounded disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleDeleteClip}
          disabled={!selectedClip}
        >
          Delete
        </button>
      </div>
    </section>
  );
}

export default ClipPool;
