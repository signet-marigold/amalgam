import React, { useRef } from 'react';

interface ToolbarProps {
  onFileChange: (file: File) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onFileChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileChange(file);
    }
  };

  return (
    <div className="flex items-center p-2 border-b border-bordercolor">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="video/*"
        onChange={handleFileChange}
      />
      <button 
        className="mx-1 bg-primary hover:bg-primary-hover px-4 py-2 rounded"
        onClick={handleImportClick}
      >
        Import Media
      </button>
      <button className="mx-1 bg-primary hover:bg-primary-hover px-4 py-2 rounded">Export Video</button>
      <select className="mx-1 px-2 py-1 rounded bg-background border border-bordercolor" id="resolution-select" defaultValue="1080p">
        <option value="720p">720p</option>
        <option value="1080p">1080p</option>
        <option value="4k">4K</option>
      </select>
      <select className="mx-1 px-2 py-1 rounded bg-background border border-bordercolor" id="framerate-select" defaultValue="30">
        <option value="24">24 fps</option>
        <option value="30">30 fps</option>
        <option value="60">60 fps</option>
      </select>
    </div>
  );
}

export default Toolbar;
