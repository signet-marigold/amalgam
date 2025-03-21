interface ExportDialogProps {
}

const ExportDialog: React.FC<ExportDialogProps> = ({ }) => {
  return (
    <div id="export-dialog" className="dialog hidden">
      <div className="dialog-content">
        <h2>Export Video</h2>
        <div className="form-group">
          <label>Format:</label>
          <select id="export-format" className="">
            <option value="mp4">MP4</option>
            <option value="webm">WebM</option>
          </select>
        </div>
        <div className="form-group">
          <label>Resolution:</label>
          <select id="export-resolution" className="" defaultValue="1080p">
            <option value="720p">720p (1280x720)</option>
            <option value="1080p">1080p (1920x1080)</option>
            <option value="4k">4K (3840x2160)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Frame Rate:</label>
          <select id="export-framerate" className="" defaultValue="30">
            <option value="24">24 fps</option>
            <option value="30">30 fps</option>
            <option value="60">60 fps</option>
          </select>
        </div>
        <div className="form-group">
          <label>Quality:</label>
          <input type="range" id="export-quality" min="1" max="100" value="80"/>
          <span id="quality-value">80%</span>
        </div>
        <div id="export-progress" className="">
          <div className="progress-bar">
            <div id="progress-fill" className="w-0"></div>
          </div>
          <div id="progress-text">0%</div>
        </div>
        <div className="dialog-buttons">
          <button id="export-cancel-btn" className="">Cancel</button>
          <button id="export-confirm-btn" className="bg-primary">Export</button>
        </div>
      </div>
    </div>
  );
}

export default ExportDialog;
