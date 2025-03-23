import React, { useState } from 'react';
import { PreviewRenderer } from '../timeline/preview-renderer';

interface ExportDialogProps {
  previewRenderer: PreviewRenderer;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ previewRenderer, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      setProgress(0);

      // Wait a moment for any pending initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // Start the export process
      await previewRenderer.exportVideo();
      setProgress(100);

      // Close the dialog after successful export
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      let errorMessage = 'Export failed: ';
      
      if (err instanceof Error) {
        if (err.message.includes('not properly initialized')) {
          errorMessage += 'The video editor is not ready yet. Please try again in a moment.';
        } else if (err.message.includes('No video clips')) {
          errorMessage += 'Please add some video clips to the timeline first.';
        } else if (err.message.includes('Failed to load video')) {
          errorMessage += 'Could not load one or more video clips. Please check that all clips are valid.';
        } else {
          errorMessage += err.message;
        }
      } else {
        errorMessage += 'An unexpected error occurred.';
      }
      
      setError(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-dialog-overlay">
      <div className="export-dialog">
        <h2 className="text-xl font-bold mb-4">Export Video</h2>
        <div className="export-settings">
          <p className="mb-4">Your video will be exported as WebM format with VP9 codec.</p>
          {error && (
            <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          {isExporting && (
            <div className="export-progress mb-4">
              <p>Exporting... {progress}%</p>
              <div className="progress-bar bg-gray-200 rounded h-2">
                <div 
                  className="progress bg-blue-500 h-full rounded transition-all duration-300" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          )}
          <div className="export-actions flex justify-end space-x-4">
            <button 
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleExport} 
              disabled={isExporting}
              className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {isExporting ? 'Exporting...' : 'Start Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
