interface ToolbarProps {
}

const Toolbar: React.FC<ToolbarProps> = ({ }) => {
  return (
    <div>
      <button>Import Media</button>
      <button>Export Video</button>
      <select id="resolution-select" defaultValue="1080p">
        <option value="720p">720p</option>
        <option value="1080p">1080p</option>
        <option value="4k">4K</option>
      </select>
      <select id="framerate-select" defaultValue="30">
        <option value="24">24 fps</option>
        <option value="30">30 fps</option>
        <option value="60">60 fps</option>
      </select>
    </div>
  );
}

export default Toolbar;
